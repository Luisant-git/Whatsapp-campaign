import React, { useState } from 'react';
import { Save, Eye, ArrowLeft, Trash2, GripVertical, Type, AlignLeft, ChevronDown, Calendar, CheckSquare, Circle, X, Move } from 'lucide-react';
import flowAPI from '../api/flow';
import '../styles/FlowBuilder.css';

const FlowBuilder = ({ onBack }) => {
  const [flowName, setFlowName] = useState('');
  const [screens, setScreens] = useState([
    {
      id: 'SCREEN_ONE',
      title: 'Screen 1',
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: []
      }
    }
  ]);

  // Auto-update screen ID and title when flow name changes
  const handleFlowNameChange = (name) => {
    setFlowName(name);
    if (name && screens.length === 1) {
      const updatedScreens = [...screens];
      const screenId = name.toUpperCase().replace(/[^A-Z_]/g, '_');
      updatedScreens[0].id = screenId;
      updatedScreens[0].title = name;
      setScreens(updatedScreens);
    }
  };
  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const componentTypes = [
    { type: 'TextInput', label: 'Text Input', Icon: Type },
    { type: 'TextArea', label: 'Text Area', Icon: AlignLeft },
    { type: 'Dropdown', label: 'Dropdown', Icon: ChevronDown },
    { type: 'DatePicker', label: 'Date Picker', Icon: Calendar },
    { type: 'CheckboxGroup', label: 'Checkbox', Icon: CheckSquare },
    { type: 'RadioButtonsGroup', label: 'Radio Button', Icon: Circle },
  ];

  const [draggedComponent, setDraggedComponent] = useState(null);

  const addComponent = (type) => {
    const index = screens[currentScreen].layout.children.length;
    
    const newComponent = {
      type,
      name: `${type.toLowerCase()}_${Date.now()}`,
      label: `${type}`,
      required: false,
      position: { 
        x: 150,
        y: 50 + (index * 100)
      },
      id: Date.now(),
      ...(type === 'TextInput' && { 'input-type': 'text', 'helper-text': 'Enter text' }),
      ...(type === 'TextArea' && { 'helper-text': 'Enter text' }),
      ...(type === 'Dropdown' && { 'data-source': [{ id: 'option1', title: 'Option 1' }] }),
      ...(type === 'DatePicker' && { 'helper-text': 'Select a date' }),
      ...(type === 'CheckboxGroup' && { 'data-source': [{ id: 'option1', title: 'Option 1' }] }),
      ...(type === 'RadioButtonsGroup' && { 'data-source': [{ id: 'option1', title: 'Option 1' }] })
    };

    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.push(newComponent);
    setScreens(updatedScreens);
    setSelectedComponent(updatedScreens[currentScreen].layout.children.length - 1);
  };

  const handleDragStart = (e, type) => {
    // Removed drag functionality
  };

  const handleDrop = (e) => {
    // Removed drag functionality
  };

  const handleDragOver = (e) => {
    // Removed drag functionality
  };

  const moveComponent = (index, newX, newY) => {
    // Removed drag functionality
  };

  const getComponentIcon = (type) => {
    const comp = componentTypes.find(c => c.type === type);
    return comp ? comp.Icon : Type;
  };

  const updateComponent = (index, field, value) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children[index][field] = value;
    setScreens(updatedScreens);
  };

  const removeComponent = (index) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.splice(index, 1);
    
    // Reposition remaining components
    updatedScreens[currentScreen].layout.children.forEach((comp, idx) => {
      comp.position = {
        x: 150,
        y: 50 + (idx * 100)
      };
    });
    
    setScreens(updatedScreens);
    setSelectedComponent(null);
  };

  const renderConnections = () => {
    const lines = [];
    const components = screens[currentScreen].layout.children;
    
    for (let i = 0; i < components.length - 1; i++) {
      const fromComp = components[i];
      const toComp = components[i + 1];
      
      const fromX = (fromComp.position?.x || 150) + 80;
      const fromY = (fromComp.position?.y || 0) + 50;
      const toX = (toComp.position?.x || 150) + 80;
      const toY = (toComp.position?.y || 0);
      const arrowLength = 30;

      lines.push(
        <g key={i}>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={fromY + arrowLength}
            stroke="#DC2626"
            strokeWidth="2"
          />
          <polygon
            points={`${toX},${fromY + arrowLength + 8} ${toX-5},${fromY + arrowLength} ${toX+5},${fromY + arrowLength}`}
            fill="#DC2626"
          />
        </g>
      );
    }

    return (
      <svg className="connection-svg">
        {lines}
      </svg>
    );
  };

  const handleSave = async () => {
    if (!flowName) {
      alert('Please enter a flow name');
      return;
    }

    if (screens[0].layout.children.length === 0) {
      alert('Please add at least one component to the flow');
      return;
    }

    const flowJson = {
      version: '6.0',
      screens: screens.map(screen => ({
        id: (screen.id || flowName.toUpperCase()).replace(/[^A-Z_]/g, '_') || 'SCREEN_ONE',
        title: screen.title || flowName,
        data: {},
        layout: {
          type: screen.layout.type,
          children: screen.layout.children.map(({ position, id, ...component }) => component)
        },
        terminal: true
      }))
    };

    try {
      await flowAPI.createFlow({ name: flowName, flowJson });
      alert('Flow created successfully!');
      onBack();
    } catch (error) {
      console.error('Flow creation error:', error);
      alert('Failed to create flow: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const renderPreview = () => {
    const currentScreenData = screens[currentScreen];
    return (
      <div className="preview-modal" onClick={() => setShowPreview(false)}>
        <div className="preview-content" onClick={(e) => e.stopPropagation()}>
          <div className="preview-header">
            <h3>{currentScreenData.title || 'Preview'}</h3>
            <button onClick={() => setShowPreview(false)}>
              <X size={20} />
            </button>
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
          onChange={(e) => handleFlowNameChange(e.target.value)}
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
          <div className="component-list">
            {componentTypes.map((comp) => (
              <button
                key={comp.type}
                onClick={() => addComponent(comp.type)}
                className="component-btn"
              >
                <comp.Icon size={20} className="component-icon" />
                <span>{comp.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="canvas-panel">
          <div className="screen-header">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Screen ID:</span>
              <span style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 600, fontFamily: 'monospace' }}>{screens[currentScreen].id}</span>
              <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Title:</span>
              <span style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 600 }}>{screens[currentScreen].title}</span>
            </div>
          </div>
          <div className="canvas-wireframe">
            {renderConnections()}
            {screens[currentScreen].layout.children.map((component, index) => {
              const ComponentIcon = getComponentIcon(component.type);
              return (
                <div 
                  key={index} 
                  className={`wireframe-node ${selectedComponent === index ? 'selected' : ''}`}
                  style={{
                    left: component.position?.x || 150,
                    top: component.position?.y || 50 + (index * 100)
                  }}
                  onClick={() => setSelectedComponent(index)}
                >
                  <div className="node-content">
                    <ComponentIcon size={18} />
                    <span className="node-label">{component.label}</span>
                  </div>
                  <button 
                    className="node-delete" 
                    onClick={(e) => { e.stopPropagation(); removeComponent(index); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            {screens[currentScreen].layout.children.length === 0 && (
              <div className="empty-wireframe">
                <p>👈 Drag components here to build your flow</p>
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
              {(screens[currentScreen].layout.children[selectedComponent].type === 'Dropdown' ||
                screens[currentScreen].layout.children[selectedComponent].type === 'CheckboxGroup' ||
                screens[currentScreen].layout.children[selectedComponent].type === 'RadioButtonsGroup') && (
                <div className="form-group">
                  <label>Options (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={(screens[currentScreen].layout.children[selectedComponent]['data-source'] || []).join(', ')}
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt);
                      updateComponent(selectedComponent, 'data-source', options);
                    }}
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
