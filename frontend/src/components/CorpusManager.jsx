import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const CorpusManager = () => {
  const [intents, setIntents] = useState([]);
  const [intent, setIntent] = useState('');
  const [utterances, setUtterances] = useState('');
  const [responses, setResponses] = useState('');
  const [qValues, setQValues] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchIntents();
  }, []);

  const fetchIntents = async () => {
    try {
      const result = await axios.get('http://localhost:5000/intents');
      setIntents(result.data);
    } catch (error) {
      console.error('Error fetching intents:', error);
    }
  };

  const addOrUpdateIntent = async () => {
    const responseArray = responses.split(';').map(item => item.trim());
    
    let qValuesArray = [];
    if (qValues) {
      qValuesArray = qValues.split(';').map(val => parseFloat(val.trim()) || 0);
    }
    
    while (qValuesArray.length < responseArray.length) {
      qValuesArray.push(0);
    }
    
    const newIntent = {
      intent,
      utterances: utterances.split(';').map(item => item.trim()),
      responses: responseArray,
      qValues: qValuesArray
    };
  
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/intents/${editingId}`, newIntent);
      } else {
        await axios.post('http://localhost:5000/intents', newIntent);
      }
      resetForm();
      fetchIntents();
    } catch (error) {
      console.error('Error saving intent:', error);
    }
  };

  const deleteIntent = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/intents/${id}`);
      fetchIntents();
    } catch (error) {
      console.error('Error deleting intent:', error);
    }
  };

  const resetForm = () => {
    setIntent('');
    setUtterances('');
    setResponses('');
    setQValues('');
    setEditingId(null);
  };

  const startEditing = (intent) => {
    setIntent(intent.intent);
    setUtterances(intent.utterances.join('; '));
    setResponses(intent.responses.join('; '));
    setQValues(intent.qValues.join('; '));
    setEditingId(intent._id);
  };

  return (
    <div className="container">
      <h1 className="heading">{editingId ? 'Edit Intent' : 'Intent'}</h1>
      <input
        type="text"
        placeholder="Intent Name"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
      />
      <textarea
        placeholder="Utterances (semicolon separated)"
        value={utterances}
        onChange={(e) => setUtterances(e.target.value)}
      />
      <textarea
        placeholder="Responses (semicolon separated)"
        value={responses}
        onChange={(e) => setResponses(e.target.value)}
      />
      <textarea
        placeholder="Q-Values (semicolon separated, e.g., 0; 1; -1)"
        value={qValues}
        onChange={(e) => setQValues(e.target.value)}
      />
      <button className="intent-add-btn" onClick={addOrUpdateIntent}>
        {editingId ? 'Update Intent' : 'Add Intent'}
      </button>

      <h2>Intents List</h2>
      <ul>
        {intents.map((intent) => (
          <li key={intent._id}>
            <div className="intent-name">
              <strong>{intent.intent}</strong>
            </div>
            <div>
              <strong>Utterances:</strong>
              <pre>{intent.utterances.join('\n')}</pre>
            </div>
            <div>
              <strong>Responses:</strong>
              <pre>{intent.responses.map((response, index) => 
                `[${intent.qValues[index] || 0}] ${response}`
              ).join('\n')}</pre>
            </div>
            <div className="action-buttons">
              <button className="intent-edit-btn" onClick={() => startEditing(intent)}>
                Edit
              </button>
              <button
                className="intent-delete-btn"
                onClick={() => deleteIntent(intent._id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CorpusManager;