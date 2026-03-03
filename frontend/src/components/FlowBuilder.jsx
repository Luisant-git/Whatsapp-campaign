import React, { useState } from 'react';
import { Save, Eye, ArrowLeft, Trash2, GripVertical } from 'lucide-react';
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
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const componentTypes = [
    { type: 'TextInput', label: 'Text Input', icon: '📝' },
    { type: 'TextArea', label: 'Text Area', icon: '📄' },
    { type: 'Dropdown', label: 'Dropdown', icon: '📋' },
    { type: 'DatePicker', label: 'Date Picker', icon: '📅' },
    { type: 'CheckboxGroup', label: 'Checkbox', icon: '☑️' },
    { type: 'RadioButtonsGroup', label: 'Radio Button', icon: '🔘' },
  ];

  const addComponent = (type) => {
    const newComponent = {
      type,
      name: `${type.toLowerCase()}_${Date.now()}`,
      label: `Enter ${type}`,
      required: false,
      ...(type === 'TextInput' && { 'input-type': 'text', 'helper-text': '' }),
      ...(type === 'TextArea' && { 'helper-text': '' }),
      ...(type === 'Dropdown' && { 'data-source': [] }),
      ...(type === 'DatePicker' && { 'helper-text': 'Select a date' }),
      ...(type === 'CheckboxGroup' && { 'data-source': [] }),
      ...(type === 'RadioButtonsGroup' && { 'data-source': [] })
    };

    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.push(newComponent);
    setScreens(updatedScreens);
    setSelectedComponent(updatedScreens[currentScreen].layout.children.length - 1);
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
    setSelectedComponent(null);
  };

  const handleSave = async () => {
    if (!flowName) {
      alert('Please enter a flow name');
      return;
    }
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

  const renderPreview = () => {
    const currentScreenData = screens[currentScreen];
    return (
      <div className="preview-modal" onClick={() => setShowPreview(false)}>
        <div className="preview-content" onClick={(e) => e.stopPropagation()}>
          <div className="preview-header">
            <h3>{currentScreenData.title}</h3>
            <button onClick={() => setShowPreview(false)}>×</button>
          </div>
          <div className="preview-body">
            {currentScreenData.layout.children.map((component, index) => (
              <div key={index} className="preview-field">
                <label>{component.label} {component.required && <span className="required">*</span>}</label>
                {component.type === 'TextInput' && <input type="text" placeholder={component['helper-text']} />}
                {component.type === 'TextArea' && <textarea placeholder={component['helper-text']} rows={3} />}
                {component.type === 'Dropdown' && <select><option>Select an option</option></select>}
                {component.type === 'DatePicker' && <input type="date" />}
                {component.type === 'CheckboxGroup' && (
                  <div><label><input type="checkbox" /> Option 1</label></div>
                )}
                {component.type === 'RadioButtonsGroup' && (
                  <div><label><input type="radio" name={component.name} /> Option 1</label></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
          placeholder="Enter Flow Name"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
        />
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowPreview(true)}>
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
            {componentTypes.map((comp) => (
              <button key={comp.type} onClick={() => addComponent(comp.type)} className="component-btn">
                <span className="component-icon">{comp.icon}</span>
                <span>{comp.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="canvas-panel">
          <div className="screen-header">
            <input
              type="text"
              className="screen-title-input"
              value={screens[currentScreen].title}
              onChange={(e) => {
                const updatedScreens = [...screens];
                updatedScreens[currentScreen].title = e.target.value;
                setScreens(updatedScreens);
              }}
              placeholder="Screen Title"
            />
            <input
              type="text"
              className="screen-id-input"
              value={screens[currentScreen].id}
              onChange={(e) => {
                const updatedScreens = [...screens];
                updatedScreens[currentScreen].id = e.target.value.toUpperCase().replace(/\s/g, '_');
                setScreens(updatedScreens);
              }}
              placeholder="SCREEN_ID"
            />
          </div>
          <div className="canvas">
            {screens[currentScreen].layout.children.map((component, index) => (
              <div 
                key={index} 
                className={`component-item ${selectedComponent === index ? 'selected' : ''}`}
                onClick={() => setSelectedComponent(index)}
              >
                <div className="component-drag">
                  <GripVertical size={16} />
                </div>
                <div className="component-content">
                  <div className="component-label">
                    <span className="component-type">{component.type}</span>
                    <span className="component-name">{component.label}</span>
                  </div>
                  {component.required && <span className="required-badge">Required</span>}
                </div>
                <button className="component-delete" onClick={(e) => { e.stopPropagation(); removeComponent(index); }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {screens[currentScreen].layout.children.length === 0 && (
              <div className="empty-canvas">
                <p>👈 Click on components to add them here</p>
              </div>
            )}
          </div>
        </div>

        <div className="properties-panel">
          <h3>Properties</h3>
          {selectedComponent !== null ? (
            <div className="properties-form">
              <div className="form-group">
                <label>Label</label>
                <input
                  type="text"
                  value={screens[currentScreen].layout.children[selectedComponent].label}
                  onChange={(e) => updateComponent(selectedComponent, 'label', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Field Name</label>
                <input
                  type="text"
                  value={screens[currentScreen].layout.children[selectedComponent].name}
                  onChange={(e) => updateComponent(selectedComponent, 'name', e.target.value)}
                />
              </div>
              {screens[currentScreen].layout.children[selectedComponent]['helper-text'] !== undefined && (
                <div className="form-group">
                  <label>Helper Text</label>
                  <input
                    type="text"
                    value={screens[currentScreen].layout.children[selectedComponent]['helper-text']}
                    onChange={(e) => updateComponent(selectedComponent, 'helper-text', e.target.value)}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={screens[currentScreen].layout.children[selectedComponent].required}
                    onChange={(e) => updateComponent(selectedComponent, 'required', e.target.checked)}
                  />
                  Required Field
                </label>
              </div>
            </div>
          ) : (
            <p className="no-selection">Select a component to edit its properties</p>
          )}
        </div>
      </div>

      {showPreview && renderPreview()}
    </div>
  );
};

export default FlowBuilder;
