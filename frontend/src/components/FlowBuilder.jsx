import React, { useState } from 'react';
import { Plus, Save, Eye, ArrowLeft } from 'lucide-react';
import flowAPI from '../api/flow';
import '../styles/FlowBuilder.css';

const FlowBuilder = ({ onBack }) => {
  const [flowName, setFlowName] = useState('');
  const [screens, setScreens] = useState([
    {
      id: 'SIGN_IN',
      title: 'Sign In',
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: []
      }
    }
  ]);
  const [currentScreen, setCurrentScreen] = useState(0);

  const addComponent = (type) => {
    const newComponent = {
      type,
      name: `${type}_${Date.now()}`,
      label: `New ${type}`,
      required: false,
      ...(type === 'TextInput' && { 'input-type': 'text' }),
      ...(type === 'Dropdown' && { 'data-source': [] })
    };

    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.push(newComponent);
    setScreens(updatedScreens);
  };

  const updateComponent = (index, field, value) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children[index][field] = value;
    setScreens(updatedScreens);
  };

  const removeComponent = (index) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.splice(index, 1);
    setScreens(updatedScreens);
  };

  const handleSave = async () => {
    const flowJson = {
      version: '3.0',
      screens: screens.map(screen => ({
        id: screen.id,
        title: screen.title,
        data: screen.data,
        layout: screen.layout,
        terminal: true
      }))
    };

    try {
      await flowAPI.createFlow({ name: flowName, flowJson });
      alert('Flow created successfully!');
      onBack();
    } catch (error) {
      alert('Failed to create flow');
    }
  };

  return (
    <div className="flow-builder">
      <div className="builder-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <input
          type="text"
          className="flow-name-input"
          placeholder="Flow Name"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
        />
        <div className="header-actions">
          <button className="btn-secondary">
            <Eye size={18} />
            Preview
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save Flow
          </button>
        </div>
      </div>

      <div className="builder-content">
        <div className="components-panel">
          <h3>Components</h3>
          <div className="component-list">
            <button onClick={() => addComponent('TextInput')}>Text Input</button>
            <button onClick={() => addComponent('TextArea')}>Text Area</button>
            <button onClick={() => addComponent('Dropdown')}>Dropdown</button>
            <button onClick={() => addComponent('DatePicker')}>Date Picker</button>
            <button onClick={() => addComponent('CheckboxGroup')}>Checkbox</button>
            <button onClick={() => addComponent('RadioButtonsGroup')}>Radio Button</button>
          </div>
        </div>

        <div className="canvas-panel">
          <div className="screen-header">
            <h3>{screens[currentScreen].title}</h3>
          </div>
          <div className="canvas">
            {screens[currentScreen].layout.children.map((component, index) => (
              <div key={index} className="component-item">
                <div className="component-header">
                  <span>{component.type}</span>
                  <button onClick={() => removeComponent(index)}>×</button>
                </div>
                <input
                  type="text"
                  placeholder="Label"
                  value={component.label}
                  onChange={(e) => updateComponent(index, 'label', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Name (field name)"
                  value={component.name}
                  onChange={(e) => updateComponent(index, 'name', e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={component.required}
                    onChange={(e) => updateComponent(index, 'required', e.target.checked)}
                  />
                  Required
                </label>
              </div>
            ))}
            {screens[currentScreen].layout.children.length === 0 && (
              <div className="empty-canvas">
                <p>Drag components here or click on components to add</p>
              </div>
            )}
          </div>
        </div>

        <div className="properties-panel">
          <h3>Properties</h3>
          <p>Select a component to edit properties</p>
        </div>
      </div>
    </div>
  );
};

export default FlowBuilder;
