import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import Modal from 'react-modal';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';


import './App.css'; // Import custom CSS file for styling

const CodeBlock = ({ code }) => {
  return (
    <SyntaxHighlighter language="python" style={darcula}>
      {code}
    </SyntaxHighlighter>
  );
};

const App = () => {
  const [csvContent, setCsvContent] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [promptData, setPromptData] = useState([]);
  const [transformedCsvData, setTransformedCsvData] = useState([]);
  const [gptResponse, setGptResponse] = useState('');
  const [selectedTransformType, setSelectedTransformType] = useState('transform_json1');
  const [newTransformation, setNewTransformation] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isNewTransformLoading, setIsNewTransformLoading] = useState(false);
  const [showJsonSection, setShowJsonSection] = useState(false);
  const [formattedJson, setFormattedJson] = useState(''); // Define formattedJson in state


  const handleCsvContentChange = (event) => {
    setCsvContent(event.target.value);
    const results = Papa.parse(event.target.value, { header: true });
    setCsvData(results.data);
  };

  const handleSampleCsv = () => {
    const sampleCsv = `City,Date of upload,Emissions_2015_Q1,Emissions_2015_Q2,Emissions_2015_Q3,Emissions_2015_Q4,Emissions_2016_Q1,Emissions_2016_Q2,Emissions_2016_Q3,Emissions_2016_Q4\n"Rio de Janeiro","14/07/1991",10,20,30,40,50,60,70,80\n"Buenos Aires","14/07/1991",11,21,31,41,51,61,71,81\n"Sao Paulo","14/07/1991",12,22,32,42,52,62,72,82`;
    setCsvContent(sampleCsv);
    const results = Papa.parse(sampleCsv.trim(), { header: true });
    setCsvData(results.data);
  };

  const handleSampleJsonIFRS = () => {
    // Sample JSON data
    const sampleJson = `{
      "greenhouseGasEmissions": {
        "periodOfReport": {
          "yearOfReport": 2018,
          "yearOfBaseline": 2015,
          "yearOfTarget": 2030
        },
        "scope1and2GHGEmissions": {
          "grossScope1GHGEmissions": {
            "value": 2000,
            "description": "Absolute gross scope 1 greenhouse gas emissions generated during the reporting period...",
            "unit": "Metric tons (t) CO₂-e"
          },
          "grossLocationBasedScope2GHGEmissions": {
            "value": 1000,
            "description": "Absolute gross location-based scope 2 greenhouse gas emissions generated...",
            "unit": "Metric tons (t) CO₂-e"
          },
          "grossScope1and2GHGEmissions": {
            "value": 3000,
            "description": "The sum of gross scope 1 and location-based scope 2 greenhouse gas emissions generated...",
            "unit": "Metric tons (t) CO₂-e"
          }
        },
        "grossScope3GHGEmissions": {
          "value": 2500,
          "scope3CategoriesIncluded": "downstreamSoldProducts, goodsTransportation, travels, financialInvestments, others",
          "description": "Absolute gross scope 3 greenhouse gas emissions generated...",
          "unit": "Metric tons (t) CO₂-e"
        },
        "grossMarketBasedScope2GHGEmissions": {
          "value": 1500,
          "description": "Absolute gross market-based scope 2 greenhouse gas emissions generated...",
          "unit": "Metric tons (t) CO₂-e"
        }
      }
    }`;

    // Set the sample JSON data into the input field
    setCsvContent(sampleJson);

    // Clear the CSV data
    setCsvData([]);

    // Format the JSON with indentation for display
    const formatted = JSON.stringify(JSON.parse(sampleJson), null, 2);
    setFormattedJson(formatted);

    // Set isJsonDisplayed to true to show the JSON data
    setShowJsonSection(true);

    // Automatically select the "Transform IFRS->EFRAG" option
    setSelectedTransformType('transform_json1'); // <-- Set to 'transform_json1'
  };

  const handleSampleJsonEFRAG = () => {
    // Sample JSON data
    const sampleJson = `{
      "E1 - DR E1- 07.0-Scope 1 Green House Gas (GHG) Emissions": [
        {
          "reportingScope": {
            "reportingYear": 2018,
            "baselineYear": 2015,
            "targetYear": 2030,
            "emissionScope": "Scope 1"
          },
          "greenHouseGas(GHG)Reporting": {
            "ghgEmissions(CO2e)": 2000
          }
        }
      ],
      "E1 - DR E1-08.0 - Scope 2 Green House Gas (GHG) Emissions": [
        {
          "reportingScope": {
            "reportingYear": 2018,
            "baselineYear": 2015,
            "targetYear": 2030,
            "emissionScope": "Scope 2"
          },
          "indirectGHGEmissionCalculationMethods": {
            "marketBasedCalculation": {
              "ghgEmissions(CO2e)": 1500
            },
            "locationBasedCalculation": {
              "ghgEmissions(CO2e)": 1000
            }
          }
        }
      ],
      "E1 - DR E1-09.0 - Scope 3 Green House Gas (GHG) Emissions": [
        {
          "reportingScope": {
            "reportingYear": 2018,
            "baselineYear": 2015,
            "targetYear": 2030,
            "emissionScope": "Scope 3"
          },
          "scope3GHGEmissionCategories": {
            "totalScope3GHGEmissions": {
              "ghgEmissions(CO2e)": 2500
            },
            "downstreamSoldProducts": {
              "ghgEmissions(CO2e)": 500
            },
            "goodsTransportation": {
              "ghgEmissions(CO2e)": 500
            },
            "travels": {
              "ghgEmissions(CO2e)": 500
            },
            "financialInvestments": {
              "ghgEmissions(CO2e)": 500
            },
            "otherScope3EmissionCategories": {
              "ghgEmissions(CO2e)": 500
            }
          }
        }
      ],
      "E1 - DR E1-10.1 - Total Green House Gas (GHG) Emissions": [
        {
          "reportingScope": {
            "reportingYear": 2018,
            "baselineYear": 2015,
            "targetYear": 2030,
            "emissionScope": "Total GHG Emissions (Scope 1, 2 and 3)"
          },
          "totalGHGEmissions": {
            "ghgEmissions(CO2e)": 5500
          },
          "indirectGHGEmissionCalculationMethods": {
            "marketBasedCalculation": {
              "ghgEmissions(CO2e)": 1500
            },
            "locationBasedCalculation": {
              "ghgEmissions(CO2e)": 1000
            }
          }
        }
      ]
    }`;

    // Set the sample JSON data into the input field
    setCsvContent(sampleJson);

    // Clear the CSV data
    setCsvData([]);

    // Format the JSON with indentation for display
    const formatted = JSON.stringify(JSON.parse(sampleJson), null, 2);
    setFormattedJson(formatted);

    // Set isJsonDisplayed to true to show the JSON data
    setShowJsonSection(true);

    // Automatically select the "Transform EFRAG->IFRS" option
    setSelectedTransformType('transform_json2'); // <-- Set to 'transform_json2'
  };


    const handleSamplePrompt = () => {
      const samplePrompt = 'Data Schema A: \nField	Field description City	Unique name of actor city Country	Name of country to which city belongs to Country ISO	ISO code for that Country Year	Year of emissions report Date of submission	Date the data was submitted Emissions	Total CO2 emissions in Million Tonnes City Population	Population of that city \nDictionary Table:\n Field	Field description City	Unique name of actor city Alternative names	Collection of alternative names for that city Country	Name of country to which city belongs to Country ISO	ISO code for that Country City population	Population of that city \nData Schema B: \nField	Field description City	Name of the city reporting emissions formatted as "City, Country" Date of upload	Date the data was uploaded Emissions_2015_Q1	Total CO2 emissions in tonnes for Q1 of 2015 Emissions_2015_Q2	Total CO2 emissions in tonnes for Q2 of 2015 Emissions_2015_Q3	Total CO2 emissions in tonnes for Q3 of 2015 Emissions_2015_Q4	Total CO2 emissions in tonnes for Q4 of 2015 Emissions_2016_Q1	Total CO2 emissions in tonnes for Q1 of 2016 Emissions_2016_Q2	Total CO2 emissions in tonnes for Q2 of 2016 Emissions_2016_Q3	Total CO2 emissions in tonnes for Q3 of 2016 Emissions_2016_Q4	Total CO2 emissions in tonnes for Q4 of 2016';
  setNewTransformation(samplePrompt);
  };

const handleSubmit = async () => {
  setIsTransforming(true);
  try {
    let response;

    // Define the transformation type based on the selectedTransformType
    let transformType;
    if (selectedTransformType === 'transform_json1') {
      transformType = 'transform_json1';
    } else if (selectedTransformType === 'transform_json2') {
      transformType = 'transform_json2'; // Add support for 'EFRAG->IFRS' transformation
    } else {
      // Handle CSV data
      console.log('Sending CSV data for transformation:', csvContent);
      response = await axios.post('https://dataharmonizationbackend.joaquinvan.repl.co/transform', {
        data: csvContent,  // CSV data as a string
        transform_type: selectedTransformType,  // Use the appropriate transformation type
      });
    }

    if (transformType) {
      console.log('Sending data for transformation:', JSON.stringify(csvContent));
      response = await axios.post('https://dataharmonizationbackend.joaquinvan.repl.co/transform', {
        data: JSON.stringify(csvContent), // CSV data as JSON string
        transform_type: transformType, // Use the appropriate transformation type
      });
      setGptResponse(JSON.stringify(JSON.parse(response.data.data), null, 2));
    }

    if (response.data && response.data.data) {
      // Handle both transformation types similarly
      const parsedData = Papa.parse(response.data.data, { header: true }).data;
      setTransformedCsvData(parsedData);
    }
  } catch (error) {
    console.error(error);
  }
  setIsTransforming(false);
};


  const handleDownload = () => {
    {/*const csvContent = Papa.unparse(transformedCsvData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transformed.csv';
    link.click();
    URL.revokeObjectURL(url);*/}
  if (gptResponse) {
      const jsonContent = JSON.stringify(JSON.parse(gptResponse), null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'transformed.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleTransformTypeChange = (event) => {
    setSelectedTransformType(event.target.value);
  };

  const handleNewTransformationChange = (event) => {
    setNewTransformation(event.target.value);
  };

  const handleOpenModal = () => {
    setModalIsOpen(true);
  };

  const handleCloseModal = () => {
    setModalIsOpen(false);
  };

  const handleSendNewTransformation = async () => {
    setIsNewTransformLoading(true);
    try {
      const response = await axios.post('https://dataharmonizationbackend.joaquinvan.repl.co/newtransformation', {
        newTransformation: newTransformation,
      });
      const gptResponse = response.data.message;
      setGptResponse(gptResponse);
      setNewTransformation('');
      setModalIsOpen(false);
    } catch (error) {
      console.error(error);
    }
    setIsNewTransformLoading(false);
  };
  
  return (
    <div className="container">
      <div className="navbar">
        <a href="https://www.openearth.org/">
          <img src="https://uploads-ssl.webflow.com/63e521a7e3f1b3994d6489a3/641ca56053b14974190d1c9d_OEF-Isotype-p-1080.png" alt="Logo" />
        </a>
        Data Harmonization Tool
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="New Transformation Modal"
      >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div className = "titletext-dark">New Transformation</div>
          <button className="sample-button" onClick={handleSamplePrompt}>Sample Prompt</button>
        </div>
        
        <textarea 
          className = "input-textarea"
          value={newTransformation}
          onChange={handleNewTransformationChange}
          placeholder="Paste your prompt for a new transformation here..."
          rows={10}
        />
        <button className="send-new-transform-button" onClick={handleSendNewTransformation} disabled={isNewTransformLoading}>
          {isNewTransformLoading ? <div className="spinner" /> : 'Send New Transformation'}
        </button>
        <button className="close-modal-button" onClick={handleCloseModal}>Close</button>
      </Modal>
      <div className="banner" />
      <div className="titletext">
        Transform your climate data to other schemas
      </div>
       <div className="infotext">
        Use this tool to transform data from your climate reports into other reporting formats. Paste your data in a CSV format into the input box, choose the transformation type and press the transform button. You will be able to download the output CSV.
      </div>
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Original Data</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="sample-button" onClick={handleSampleJsonIFRS}>Sample IFRS JSON</button>
                    <button className="sample-button" onClick={handleSampleJsonEFRAG}>Sample EFRAG JSON</button>
                   {/* <button className="sample-button" onClick={handleSampleCsv}>Sample CSV</button> */}           
                  </div>
        </div>
        <textarea
          className="input-textarea"
          value={csvContent}
          onChange={handleCsvContentChange}
          rows={10}
        />
        <div>
          <label htmlFor="transformType">Select Transform Type:</label>
          <select id="transformType" value={selectedTransformType} onChange={handleTransformTypeChange} className="transformType">
              <option value="transform_json1">Transform IFRS->EFRAG</option>
              <option value="transform_json2">Transform EFRAG->IFRS</option>
            {/* <option value="transform1">Transform CSV 1</option> */}
            {/* <option value="transform2">Transform CSV 2</option> */}
          </select>
        </div>
        <button className="transform-button" onClick={handleSubmit} disabled={isTransforming}>
          {isTransforming ? <div className="spinner" /> : 'Transform'}
        </button>
        <button onClick={handleOpenModal} className="new-transform-button">Add New Transformation</button>
        
        <table>
          <thead>
            <tr>
              {csvData[0] &&
                Object.keys(csvData[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {csvData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {csvData.length === 0 && showJsonSection && (
          <div className="json-display">
            <h2>Sample JSON</h2>
            <SyntaxHighlighter language="json" style={darcula}>
              {formattedJson}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Transformed Data</h2>
        <table>
          <thead>
            <tr>
              {transformedCsvData[0] &&
                Object.keys(transformedCsvData[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {transformedCsvData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
         {gptResponse && (
            <div className="json-display">
              <SyntaxHighlighter language="json" style={darcula}>
                {gptResponse}
              </SyntaxHighlighter>
            </div>
          )}
        <button className="download-button" onClick={handleDownload}>Download Data</button>
      </div>
      <div className="card">
        <h2>GPT Response</h2>
        {gptResponse.includes('```') && (
          <div className="python-code">
            <h3>Python Code:</h3>
            <CodeBlock code={gptResponse.split('```python')[1].split('```')[0]} />
          </div>
        )}
        <div>{gptResponse}</div>
      </div>
    </div>
  );
};

export default App;
