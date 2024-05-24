import React, { useState, useEffect } from 'react';
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
  const [transformedCsvData, setTransformedCsvData] = useState([]);
  const [transformedJsonData, setTransformedJsonData] = useState(null);
  const [gptResponse, setGptResponse] = useState('');
  const [selectedTransformType, setSelectedTransformType] = useState('transform_json1');
  const [newTransformation, setNewTransformation] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isNewTransformLoading, setIsNewTransformLoading] = useState(false);
  const [showJsonSection, setShowJsonSection] = useState(false);
  const [formattedJson, setFormattedJson] = useState('');
  const [loadingMessages] = useState(["Engaging our AI: this might take a minute or two...", "Reviewing schemas: please hold tight...", "Studying fields: our LLM is exploring the fields in each schema... ", "Matching taxonomies: kindly wait while we process the data...", "Generating transformation code: writing python code to harmonize data...","Reviewing and documenting code: the AI is adding documentation for clarity...", "Creating output: rendering output message..."]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 6000);
    return () => {
      clearInterval(interval);
    };
  }, [loadingMessages.length]);
  
  const handleCsvContentChange = (event) => {
    setCsvContent(event.target.value);
    const results = Papa.parse(event.target.value, { header: true });
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
    setSelectedTransformType('transform_json1');
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
      const ifrsData = {
        greenhouseGasEmissions: {
          periodOfReport: {
            yearOfReport: 2018,
            yearOfBaseline: 2015,
            yearOfTarget: 2030,
          },
          scope1and2GHGEmissions: {
            grossScope1GHGEmissions: {
              value: 2000,
              description: "Absolute gross scope 1 greenhouse gas emissions generated during the reporting period...",
              unit: "Metric tons (t) CO₂-e",
            },
            grossLocationBasedScope2GHGEmissions: {
              value: 1000,
              description: "Absolute gross location-based scope 2 greenhouse gas emissions generated...",
              unit: "Metric tons (t) CO₂-e",
            },
            grossScope1and2GHGEmissions: {
              value: 3000,
              description: "The sum of gross scope 1 and location-based scope 2 greenhouse gas emissions generated...",
              unit: "Metric tons (t) CO₂-e",
            },
          },
          grossScope3GHGEmissions: {
            value: 2500,
            scope3CategoriesIncluded: "downstreamSoldProducts, goodsTransportation, travels, financialInvestments, others",
            description: "Absolute gross scope 3 greenhouse gas emissions generated...",
            unit: "Metric tons (t) CO₂-e",
          },
          grossMarketBasedScope2GHGEmissions: {
            value: 1500,
            description: "Absolute gross market-based scope 2 greenhouse gas emissions generated...",
            unit: "Metric tons (t) CO₂-e",
          },
        },
      };
    
      const efragData = {
        "E1 - DR E1- 07.0-Scope 1 Green House Gas (GHG) Emissions": [
          {
            reportingScope: {
              reportingYear: 2018,
              baselineYear: 2015,
              targetYear: 2030,
              emissionScope: "Scope 1",
            },
            greenHouseGasGHGReporting: {
              "ghgEmissions(CO2e)": 0, // Fill in the value
            },
          },
        ],
        "E1 - DR E1-08.0 - Scope 2 Green House Gas (GHG) Emissions": [
          {
            reportingScope: {
              reportingYear: 0, // Fill in the year
              baselineYear: 0, // Fill in the year
              targetYear: 0, // Fill in the year
              emissionScope: "Scope 2",
            },
            indirectGHGEmissionCalculationMethods: {
              marketBasedCalculation: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              locationBasedCalculation: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
            },
          },
        ],
        "E1 - DR E1-09.0 - Scope 3 Green House Gas (GHG) Emissions": [
          {
            reportingScope: {
              reportingYear: 0, // Fill in the year
              baselineYear: 0, // Fill in the year
              targetYear: 0, // Fill in the year
              emissionScope: "Scope 3",
            },
            scope3GHGEmissionCategories: {
              totalScope3GHGEmissions: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              downstreamSoldProducts: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              goodsTransportation: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              travels: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              financialInvestments: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              otherScope3EmissionCategories: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
            },
          },
        ],
        "E1 - DR E1-10.1 - Total Green House Gas (GHG) Emissions": [
          {
            reportingScope: {
              reportingYear: 0, // Fill in the year
              baselineYear: 0, // Fill in the year
              targetYear: 0, // Fill in the year
              emissionScope: "Total GHG Emissions (Scope 1, 2 and 3)",
            },
            totalGHGEmissions: {
              "ghgEmissions(CO2e)": 0, // Fill in the value
            },
            indirectGHGEmissionCalculationMethods: {
              marketBasedCalculation: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
              locationBasedCalculation: {
                "ghgEmissions(CO2e)": 0, // Fill in the value
              },
            },
          },
        ],
      };
    
      const samplePrompt = 'Data Schema A:\n\n' + JSON.stringify(ifrsData, null, 2) + '\n\n' + 'Data Schema B:\n\n' + JSON.stringify(efragData, null, 2);
    
      setNewTransformation(samplePrompt);
    };

const handleSubmit = async () => {
  setIsTransforming(true);
  try {
    let response;

    let transformType;
    if (selectedTransformType === 'transform_json1') {
      transformType = 'transform_json1';
    } else if (selectedTransformType === 'transform_json2') {
      transformType = 'transform_json2'; 
    } else {
      console.log('Sending CSV data for transformation:', csvContent);
      response = await axios.post('https://localhost:5000/transform', {
        data: csvContent,
        transform_type: selectedTransformType,
      });
    }

    if (transformType) {
      console.log('Sending data for transformation:', JSON.stringify(csvContent));
      response = await axios.post('http://localhost:5000/transform', {
        data: JSON.stringify(csvContent), 
        transform_type: transformType,
      });
      setTransformedJsonData(JSON.stringify(JSON.parse(response.data.data), null, 2));
    }

    if (response.data && response.data.data) {
      const parsedData = Papa.parse(response.data.data, { header: true }).data;
      setTransformedCsvData(parsedData);
    }
  } catch (error) {
    console.error(error);
  }
  setIsTransforming(false);
};


  const handleDownload = () => {
  if (transformedJsonData) {
      const jsonContent = JSON.stringify(JSON.parse(transformedJsonData), null, 2);
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
      const response = await axios.post('http://localhost:5000/newtransformation', {
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
          placeholder="Paste two schemas to generate a new transformation here in the following format: Schema A: <Schema A>, Schema B: <Schema B>"
          rows={10}
        />
        <button className="send-new-transform-button" onClick={handleSendNewTransformation} disabled={isNewTransformLoading}>
          {isNewTransformLoading ? <div className="spinner" /> : 'Send New Transformation'}
        </button>
        <button className="close-modal-button" onClick={handleCloseModal}>Close</button>
          {isNewTransformLoading && (
                <div className="loading-message-container">
                  <p>{loadingMessages[currentMessageIndex]}</p>
                </div>
          )}
      </Modal>
      <div className="banner" />
      <div className="titletext">
        Transform your climate data to other schemas
      </div>
       <div className="infotext">
        Use this tool to transform data from your climate reports into other reporting formats. Paste your data in a JSON format into the input box, choose the transformation type and press the transform button. You will be able to download the output JSON. You can also use the tool to generate new transformations between any two reporting schemas by clicking "Add New Transformation".
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
            <option value="transform_json1">Transform IFRS-&gt;EFRAG</option>
            <option value="transform_json2">Transform EFRAG-&gt;IFRS</option>
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
         {transformedJsonData && (
            <div className="json-display">
              <SyntaxHighlighter language="json" style={darcula}>
                {transformedJsonData}
              </SyntaxHighlighter>
            </div>
          )}
        <button className="download-button" onClick={handleDownload}>Download Data</button>
      </div>
      <div className="card">
        <h2>New Transformation Output</h2>
        {gptResponse.includes('```') && (
          <div className="python-code">
            <h3>Python Code:</h3>
            <CodeBlock code={gptResponse.split('```python')[1].split('```')[0]} />
            <h3>Full Message:</h3>
            <ReactMarkdown>{gptResponse}</ReactMarkdown>  
          </div>
        )}
        
      </div>
    </div>
  );
};

export default App;
