from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io
import logging
import requests
from io import StringIO
import os
import openai
import json
from dotenv import load_dotenv
from openai import OpenAI


logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Load the dictionary data
dictionary_df = pd.read_csv('dictionary.csv')  # adjust file path if necessary

# Load the API key from the .env file
load_dotenv()
openai.api_key = os.getenv('OPENAI_API_KEY')

def transform_csv1(csv_string):
    # Read CSV data into DataFrame
    schema_b_df = pd.read_csv(io.StringIO(csv_string))
    print("Input Data:")
    print(schema_b_df.head())

    # Replace city names with unique names from the Dictionary Table
    city_name_map = dictionary_df.set_index('Alternative names')['City'].to_dict()
    schema_b_df['City'] = schema_b_df['City'].replace(city_name_map)
    print("Data after replacing city names:")
    print(schema_b_df.head())

    # Merge Schema B DataFrame with Dictionary Table to get Country ISO and City Population
    merged_df = schema_b_df.merge(dictionary_df[['City', 'Country ISO', 'City population']], on='City', how='left')
    print("Data after merging with dictionary:")
    print(merged_df.head())

    # Melt Schema B DataFrame to convert emissions columns into rows with 'Year' and 'Emissions' columns
    melted_df = merged_df.melt(id_vars=['City', 'Country ISO', 'Date of upload', 'City population'],
                               var_name='Year and Quarter', value_name='Emissions')
    print("Data after melting:")
    print(melted_df.head())

    # Extract Year and Quarter from 'Year and Quarter' column
    melted_df[['Year', 'Quarter']] = melted_df['Year and Quarter'].str.extract(r'Emissions_(\d{4})_(Q\d)')

    # Convert Emissions from tonnes to Million Tonnes
    melted_df['Emissions'] = melted_df['Emissions'] / 1e6

    # Group by 'City', 'Country ISO', 'Year', and 'City population' and sum the emissions by year
    grouped_df = melted_df.groupby(['City', 'Country ISO', 'Year', 'Date of upload', 'City population'], as_index=False)['Emissions'].sum()
    print("Data after grouping:")
    print(grouped_df.head())

    # Rename the 'Date of upload' column to 'Date of submission'
    final_df = grouped_df.rename(columns={'Date of upload': 'Date of submission'})
    print("Final Data:")
    print(final_df.head())

    # Convert DataFrame back to CSV
    csv_buffer = io.StringIO()
    final_df.to_csv(csv_buffer, index=False)
    transformed_csv_string = csv_buffer.getvalue()
    return transformed_csv_string

def transform_csv2(df_dict, input_csv_string):
    # Read the input CSV data
    df = pd.read_csv(StringIO(input_csv_string))

    # Log the initial input data
    logging.debug(df)

    # Check the dictionary data
    logging.debug(df_dict)

    # Melt the dataframe to have columns for each year and quarter
    df_b = pd.melt(df, id_vars=["City", "Date of upload"], var_name="emission_year_quarter", value_name="Emisions")

    # Log after the melt operation
    logging.debug(df_b)

    # Create a new column for Year based on the 'emission_year_quarter' column
    df_b["Año"] = df_b["emission_year_quarter"].apply(lambda x: x.split("_")[1])

    # Group by City and Year, calculate sum of emissions and reset index
    df_b = df_b.groupby(["City", "Año", "Date of upload"], as_index=False)["Emisions"].sum()

    # Adjust Emisions by dividing by 10000
    df_b["Emisions"] = df_b["Emisions"] / 10000

    # Log after processing
    logging.debug(df_b)

    # Merge the two dataframes using 'City' column
    final_df = pd.merge(
        df_b, 
        df_dict[['City', 'Country', 'Country ISO', 'City population']],
        on='City',
        how='left'
    )

    # Rename the columns to Spanish
    final_df.rename(columns = {
        'City':'Ciudad',
        'Año':'Año',
        'Emisions':'Emisions',
        'Date of upload':'Fecha de Observacion',
        'Country':'País',
        'Country ISO':'País ISO',
        'City population':'Poblacion'
    }, inplace = True)

    # Log the final dataframe
    logging.debug(final_df)

    # Convert DataFrame back to CSV
    csv_buffer = io.StringIO()
    final_df.to_csv(csv_buffer, index=False)
    transformed_csv_string = csv_buffer.getvalue()

    return transformed_csv_string

def transform_json1(json_data):
    # This is for IFRS->EFRAG
    logging.debug("Type of incoming json_data: %s", type(json_data))
  
    try:
        if type(json_data) is str:
            ifrs_data = json.loads(json_data.strip())
        
        
            if type(ifrs_data) is str:
                ifrs_data = json.loads(ifrs_data.strip())
        else:
            ifrs_data = json_data

        logging.debug("Type of ifrs_data after parsing: %s", type(ifrs_data))

        logging.debug("All data: %s", ifrs_data)
        logging.debug("Direct Access Test: %s", ifrs_data["greenhouseGasEmissions"])


        # Extracting IFRS Data and performing the transformation
        logging.debug("Type of ifrs_data: %s", type(ifrs_data))
        year_report = ifrs_data["greenhouseGasEmissions"]["periodOfReport"]["yearOfReport"]
        
        logging.debug("Extracting year_baseline...")
        year_baseline = ifrs_data["greenhouseGasEmissions"]["periodOfReport"]["yearOfBaseline"]
        
        logging.debug("Extracting year_target...")
        year_target = ifrs_data["greenhouseGasEmissions"]["periodOfReport"]["yearOfTarget"]

        logging.debug("Extracting scope 1...")
        scope1_value = ifrs_data["greenhouseGasEmissions"]["scope1and2GHGEmissions"]["grossScope1GHGEmissions"]["value"]
        
        logging.debug("Extracting location scope 2...")
        location_based_scope2_value = ifrs_data["greenhouseGasEmissions"]["scope1and2GHGEmissions"]["grossLocationBasedScope2GHGEmissions"]["value"]

        logging.debug("Extracting market scope 2...")
        market_based_scope2_value = ifrs_data["greenhouseGasEmissions"]["grossMarketBasedScope2GHGEmissions"]["value"]

        logging.debug("Extracting scope 3...")
        scope3_value = ifrs_data["greenhouseGasEmissions"]["grossScope3GHGEmissions"]["value"]

        # Transforming to EFRAG Schema
        efrag_data = {
            "E1 - DR E1- 07.0-Scope 1 Green House Gas (GHG) Emissions": [{
                "reportingScope": {
                    "reportingYear": year_report,
                    "baselineYear": year_baseline,
                    "targetYear": year_target,
                    "emissionScope": "Scope 1"
                },
                "greenHouseGas(GHG)Reporting": {
                    "ghgEmissions(CO2e)": scope1_value
                }
            }],
            "E1 - DR E1-08.0 - Scope 2 Green House Gas (GHG) Emissions": [{
                "reportingScope": {
                    "reportingYear": year_report,
                    "baselineYear": year_baseline,
                    "targetYear": year_target,
                    "emissionScope": "Scope 2"
                },
                "indirectGHGEmissionCalculationMethods": {
                    "marketBasedCalculation": {
                        "ghgEmissions(CO2e)": market_based_scope2_value
                    },
                    "locationBasedCalculation": {
                        "ghgEmissions(CO2e)": location_based_scope2_value
                    }
                }
            }],
            "E1 - DR E1-09.0 - Scope 3 Green House Gas (GHG) Emissions": [{
                "reportingScope": {
                    "reportingYear": year_report,
                    "baselineYear": year_baseline,
                    "targetYear": year_target,
                    "emissionScope": "Scope 3"
                },
                "scope3GHGEmissionCategories": {
                    "totalScope3GHGEmissions": {
                        "ghgEmissions(CO2e)": scope3_value
                    }
                }
            }],
            "E1 - DR E1-10.1 - Total Green House Gas (GHG) Emissions": [{
                "reportingScope": {
                    "reportingYear": year_report,
                    "baselineYear": year_baseline,
                    "targetYear": year_target,
                    "emissionScope": "Total GHG Emissions (Scope 1, 2 and 3)"
                },
                "totalGHGEmissions": {
                    "ghgEmissions(CO2e)": scope1_value + location_based_scope2_value + scope3_value
                },
                "indirectGHGEmissionCalculationMethods": {
                    "marketBasedCalculation": {
                        "ghgEmissions(CO2e)": market_based_scope2_value
                    },
                    "locationBasedCalculation": {
                        "ghgEmissions(CO2e)": location_based_scope2_value
                    }
                }
            }]
        }

        # Serialize the transformed data back to JSON
        transformed_json_string = json.dumps(efrag_data)

        return transformed_json_string
    except Exception as e:
        logging.error(f"Error in transform_json1: {str(e)}")
        return str(e)  # Return any error messages as a string

def transform_json2(json_data):
    # This is for EFRAG->IFRS
    logging.debug("Type of incoming json_data: %s", type(json_data))

    try:
        # First parse to get the string representation of the JSON
        efrag_data_string = json.loads(json_data)
        
        # Second parse to convert the string to a dictionary
        efrag_data = json.loads(efrag_data_string)

        logging.debug("Type of efrag_data after parsing: %s", type(efrag_data))
        logging.debug("All data: %s", efrag_data)

        # Extracting the necessary data from EFRAG
        logging.debug("Extracting data from EFRAG...")
        scope1 = efrag_data["E1 - DR E1- 07.0-Scope 1 Green House Gas (GHG) Emissions"][0]
        scope2 = efrag_data["E1 - DR E1-08.0 - Scope 2 Green House Gas (GHG) Emissions"][0]
        scope3 = efrag_data["E1 - DR E1-09.0 - Scope 3 Green House Gas (GHG) Emissions"][0]

        # Transforming the data to IFRS
        ifrs_data = {
            "greenhouseGasEmissions": {
                "periodOfReport": {
                    "yearOfReport": scope1["reportingScope"]["reportingYear"],
                    "yearOfBaseline": scope1["reportingScope"]["baselineYear"],
                    "yearOfTarget": scope1["reportingScope"]["targetYear"]
                },
                "scope1and2GHGEmissions": {
                    "grossScope1GHGEmissions": {
                        "value": scope1["greenHouseGas(GHG)Reporting"]["ghgEmissions(CO2e)"],
                        "description": "Absolute gross scope 1 greenhouse gas emissions generated during the reporting period...",
                        "unit": "Metric tons (t) CO₂-e"
                    },
                    "grossLocationBasedScope2GHGEmissions": {
                        "value": scope2["indirectGHGEmissionCalculationMethods"]["locationBasedCalculation"]["ghgEmissions(CO2e)"],
                        "description": "Absolute gross location-based scope 2 greenhouse gas emissions generated...",
                        "unit": "Metric tons (t) CO₂-e"
                    },
                    "grossScope1and2GHGEmissions": {
                        "value": scope1["greenHouseGas(GHG)Reporting"]["ghgEmissions(CO2e)"] + scope2["indirectGHGEmissionCalculationMethods"]["locationBasedCalculation"]["ghgEmissions(CO2e)"],
                        "description": "The sum of gross scope 1 and location-based scope 2 greenhouse gas emissions generated...",
                        "unit": "Metric tons (t) CO₂-e"
                    }
                },
                "grossScope3GHGEmissions": {
                    "value": scope3["scope3GHGEmissionCategories"]["totalScope3GHGEmissions"]["ghgEmissions(CO2e)"],
                    "scope3CategoriesIncluded": ",".join(scope3["scope3GHGEmissionCategories"].keys()),
                    "description": "Absolute gross scope 3 greenhouse gas emissions generated...",
                    "unit": "Metric tons (t) CO₂-e"
                },
                "grossMarketBasedScope2GHGEmissions": {
                    "value": scope2["indirectGHGEmissionCalculationMethods"]["marketBasedCalculation"]["ghgEmissions(CO2e)"],
                    "description": "Absolute gross market-based scope 2 greenhouse gas emissions generated...",
                    "unit": "Metric tons (t) CO₂-e"
                }
            }
        }

        # Serialize the transformed data back to JSON
        transformed_json_string = json.dumps(ifrs_data)

        return transformed_json_string
    except Exception as e:
        logging.error(f"Error in transform_json2: {str(e)}")
        return str(e)  # Return any error messages as a string
      
def transform_data(transform_type, input_data):
    if transform_type == 'transform1':
        transformed_data = transform_csv1(input_data)
    elif transform_type == 'transform2':
        transformed_data = transform_csv2(dictionary_df, input_data)
    elif transform_type == 'transform_json1':
        transformed_data = transform_json1(input_data)  # IFRS->EFRAG
    elif transform_type == 'transform_json2':
        transformed_data = transform_json2(input_data)  # EFRAG->IFRS
    else:
        return None

    return transformed_data

def generate_transformation(messages):
    # Include the system prompt in the messages list
    if len(messages) == 0 or messages[0]['role'] != 'system':
        messages.insert(0, {'role': 'system', 'content': '''
        You are an expert data scientist with extensive knowledge of climate accounting standards and taxonomies. 
        Please provide only the Python code, and no other explanations outside of relevant code documentation.

        You are given two data schemas: Schema A, which contains data values, and Schema B, which is empty and needs to be populated based on the data from Schema A. 
        Always make the listed steps while trying to provide the Python code:
        1.Comprehensively Review Both Schemas: Ensure all fields from both schemas are thoroughly reviewed before performing any transformations. Do not output schemas unless they are part of the Python code documentation.
        2. Account for All Fields: Ensure no fields are left out in the transformation process. Take field descriptions or documentation into account to improve matching accuracy.
        3. Field Matching and Transformation:
            * Look for direct matches between fields in Schema A and Schema B.
            * For fields in Schema B that do not have direct counterparts in Schema A, determine if they can be derived or aggregated from multiple fields in Schema A.
            * Ensure units are appropriately transformed where necessary.
            * For summary or category list fields in Schema B, ensure the transformation includes a concatenated list of relevant categories from Schema A.
        4. Unmatched Fields: If there are fields in Schema B that cannot be matched, leave them as unmatched but show them in the matching visualization as fields without a match.
        5. Accurate Reflection of Aggregated or Summary Fields: Ensure that any aggregated, total, or summary fields in either schema are accurately reflected and calculated in the transformation.
        6. Provide Detailed Transformation Steps: Each transformation step must be fully detailed and demonstrated in the code. Do not use placeholders such as "Other transformations as above" or "similar transformations for the rest of the fields".
        7. Final Check: Before finalizing, check that all possible fields in Schema B are covered with available fields in Schema A.
        '''})
    client = OpenAI()
    logging.debug("MESSAGES", messages[0]['content'] )



    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )

    return response.choices[0].message.content


messages = []

@app.route('/transform', methods=['POST'])
def handle_transform():
    try:
        data = request.get_json()
        input_data = data.get('data', '')  # 'data' can be either CSV or JSON data
        logging.debug(input_data)
        transform_type = data.get('transform_type', '')
    
    except Exception as e:
        logging.error(str(e))
        return jsonify({'error': 'Error processing JSON data'})

    transformed_data = transform_data(transform_type, input_data)

    if transformed_data is None:
        return jsonify({'error': 'Invalid transform type'})

    return jsonify({'data': transformed_data})


@app.route('/newtransformation', methods=['POST'])
def handle_new_transformation():

    global messages
  
    messages = []
  
    new_transformation = request.json['newTransformation']
    role = 'user' if len(messages) % 2 == 0 else 'assistant'
    messages.append({'role': role, 'content': new_transformation})
    #TODO enhance this prompt so it won't be just a json received from the user 
    # it should have a longer prompt with examples that work in the context

    generated_transformation = generate_transformation(messages)

    # If it's the first user message or the first message is not a system prompt, prepend the system prompt
    if len(messages) == 1 or messages[0]['role'] != 'system':
        messages.insert(0, {'role': 'system', 'content': '''
                You are an expert data scientist with extensive knowledge of climate accounting standards and taxonomies. 
        Please provide only the Python code, and no other explanations outside of relevant code documentation.

        You are given two data schemas: Schema A, which contains data values, and Schema B, which is empty and needs to be populated based on the data from Schema A. 
        Always make the listed steps while trying to provide the Python code:
        1.Comprehensively Review Both Schemas: Ensure all fields from both schemas are thoroughly reviewed before performing any transformations. Do not output schemas unless they are part of the Python code documentation.
        2. Account for All Fields: Ensure no fields are left out in the transformation process. Take field descriptions or documentation into account to improve matching accuracy.
        3. Field Matching and Transformation:
            * Look for direct matches between fields in Schema A and Schema B.
            * For fields in Schema B that do not have direct counterparts in Schema A, determine if they can be derived or aggregated from multiple fields in Schema A.
            * Ensure units are appropriately transformed where necessary.
            * For summary or category list fields in Schema B, ensure the transformation includes a concatenated list of relevant categories from Schema A.
        4. Unmatched Fields: If there are fields in Schema B that cannot be matched, leave them as unmatched but show them in the matching visualization as fields without a match.
        5. Accurate Reflection of Aggregated or Summary Fields: Ensure that any aggregated, total, or summary fields in either schema are accurately reflected and calculated in the transformation.
        6. Provide Detailed Transformation Steps: Each transformation step must be fully detailed and demonstrated in the code. Do not use placeholders such as "Other transformations as above" or "similar transformations for the rest of the fields".
        7. Final Check: Before finalizing, check that all possible fields in Schema B are covered with available fields in Schema A.
        8. Return the correctly working python code with proper imports and libraries to ensure it runs without any errors.
        RETURN ONLY PYTHON CODE
                            
        '''})
    print(messages)
    return jsonify({'message': generated_transformation})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
