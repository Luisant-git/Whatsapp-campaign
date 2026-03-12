import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Globe, 
  Layout, 
  MessageSquare, 
  Smartphone, 
  X, 
  Check, 
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Image as ImageIcon,
  Type,
  ExternalLink,
  MousePointer2
} from 'lucide-react';
import '../styles/TemplateManager.css';
import { API_BASE_URL } from '../api/config';

const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [templateLibrary, setTemplateLibrary] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('create');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, template: null, loading: false });
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    headerType: 'NONE', // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
    components: [
      { type: 'BODY', text: 'Hello {{1}}, welcome to our service!' }
    ],
    sampleValues: {} // Store sample values for variables
  });

  const categories = [
    { value: 'MARKETING', label: 'Marketing', color: '#e3f2fd' },
    { value: 'UTILITY', label: 'Utility', color: '#e8f5e8' },
    { value: 'AUTHENTICATION', label: 'Authentication', color: '#fff8e1' }
  ];

  const languages = [
    { value: 'af', label: 'Afrikaans' },
    { value: 'sq', label: 'Albanian' },
    { value: 'ar', label: 'Arabic' },
    { value: 'ar_EG', label: 'Arabic (Egypt)' },
    { value: 'ar_AE', label: 'Arabic (UAE)' },
    { value: 'ar_LB', label: 'Arabic (Lebanon)' },
    { value: 'ar_MA', label: 'Arabic (Morocco)' },
    { value: 'ar_QA', label: 'Arabic (Qatar)' },
    { value: 'az', label: 'Azerbaijani' },
    { value: 'be_BY', label: 'Belarusian' },
    { value: 'bn', label: 'Bengali' },
    { value: 'bn_IN', label: 'Bengali (India)' },
    { value: 'bg', label: 'Bulgarian' },
    { value: 'ca', label: 'Catalan' },
    { value: 'zh_CN', label: 'Chinese (China)' },
    { value: 'zh_HK', label: 'Chinese (Hong Kong)' },
    { value: 'zh_TW', label: 'Chinese (Taiwan)' },
    { value: 'hr', label: 'Croatian' },
    { value: 'cs', label: 'Czech' },
    { value: 'da', label: 'Danish' },
    { value: 'prs_AF', label: 'Dari' },
    { value: 'nl', label: 'Dutch' },
    { value: 'nl_BE', label: 'Dutch (Belgium)' },
    { value: 'en', label: 'English' },
    { value: 'en_GB', label: 'English (UK)' },
    { value: 'en_US', label: 'English (US)' },
    { value: 'en_AE', label: 'English (UAE)' },
    { value: 'en_AU', label: 'English (Australia)' },
    { value: 'en_CA', label: 'English (Canada)' },
    { value: 'en_GH', label: 'English (Ghana)' },
    { value: 'en_IE', label: 'English (Ireland)' },
    { value: 'en_IN', label: 'English (India)' },
    { value: 'en_JM', label: 'English (Jamaica)' },
    { value: 'en_MY', label: 'English (Malaysia)' },
    { value: 'en_NZ', label: 'English (New Zealand)' },
    { value: 'en_QA', label: 'English (Qatar)' },
    { value: 'en_SG', label: 'English (Singapore)' },
    { value: 'en_UG', label: 'English (Uganda)' },
    { value: 'en_ZA', label: 'English (South Africa)' },
    { value: 'et', label: 'Estonian' },
    { value: 'fil', label: 'Filipino' },
    { value: 'fi', label: 'Finnish' },
    { value: 'fr', label: 'French' },
    { value: 'fr_BE', label: 'French (Belgium)' },
    { value: 'fr_CA', label: 'French (Canada)' },
    { value: 'fr_CH', label: 'French (Switzerland)' },
    { value: 'fr_CI', label: 'French (Ivory Coast)' },
    { value: 'fr_MA', label: 'French (Morocco)' },
    { value: 'ka', label: 'Georgian' },
    { value: 'de', label: 'German' },
    { value: 'de_AT', label: 'German (Austria)' },
    { value: 'de_CH', label: 'German (Switzerland)' },
    { value: 'el', label: 'Greek' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'ha', label: 'Hausa' },
    { value: 'he', label: 'Hebrew' },
    { value: 'hi', label: 'Hindi' },
    { value: 'hu', label: 'Hungarian' },
    { value: 'id', label: 'Indonesian' },
    { value: 'ga', label: 'Irish' },
    { value: 'it', label: 'Italian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'kn', label: 'Kannada' },
    { value: 'kk', label: 'Kazakh' },
    { value: 'rw_RW', label: 'Kinyarwanda' },
    { value: 'ko', label: 'Korean' },
    { value: 'ky_KG', label: 'Kyrgyz' },
    { value: 'lo', label: 'Lao' },
    { value: 'lv', label: 'Latvian' },
    { value: 'lt', label: 'Lithuanian' },
    { value: 'mk', label: 'Macedonian' },
    { value: 'ms', label: 'Malay' },
    { value: 'ml', label: 'Malayalam' },
    { value: 'mr', label: 'Marathi' },
    { value: 'nb', label: 'Norwegian' },
    { value: 'ps_AF', label: 'Pashto' },
    { value: 'fa', label: 'Persian' },
    { value: 'pl', label: 'Polish' },
    { value: 'pt_BR', label: 'Portuguese (Brazil)' },
    { value: 'pt_PT', label: 'Portuguese (Portugal)' },
    { value: 'pa', label: 'Punjabi' },
    { value: 'ro', label: 'Romanian' },
    { value: 'ru', label: 'Russian' },
    { value: 'sr', label: 'Serbian' },
    { value: 'si_LK', label: 'Sinhala' },
    { value: 'sk', label: 'Slovak' },
    { value: 'sl', label: 'Slovenian' },
    { value: 'es', label: 'Spanish' },
    { value: 'es_AR', label: 'Spanish (Argentina)' },
    { value: 'es_CL', label: 'Spanish (Chile)' },
    { value: 'es_CO', label: 'Spanish (Colombia)' },
    { value: 'es_CR', label: 'Spanish (Costa Rica)' },
    { value: 'es_DO', label: 'Spanish (Dominican Republic)' },
    { value: 'es_EC', label: 'Spanish (Ecuador)' },
    { value: 'es_HN', label: 'Spanish (Honduras)' },
    { value: 'es_MX', label: 'Spanish (Mexico)' },
    { value: 'es_PA', label: 'Spanish (Panama)' },
    { value: 'es_PE', label: 'Spanish (Peru)' },
    { value: 'es_ES', label: 'Spanish (Spain)' },
    { value: 'es_UY', label: 'Spanish (Uruguay)' },
    { value: 'sw', label: 'Swahili' },
    { value: 'sv', label: 'Swedish' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'th', label: 'Thai' },
    { value: 'tr', label: 'Turkish' },
    { value: 'uk', label: 'Ukrainian' },
    { value: 'ur', label: 'Urdu' },
    { value: 'uz', label: 'Uzbek' },
    { value: 'vi', label: 'Vietnamese' },
    { value: 'zu', label: 'Zulu' }
  ];

  useEffect(() => {
    fetchTemplates();
    fetchTemplateLibrary();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchTemplateLibrary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/library`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTemplateLibrary(data);
      }
    } catch (error) {
      console.error('Error fetching template library:', error);
    }
  };

  const handleCreateTemplate = () => {
    setDialogType('create');
    setCurrentTemplate(null);
    setUploadedFile(null);
    setValidationError(null);
    setShowValidationErrors(false);
    setFormData({
      name: '',
      category: 'MARKETING',
      language: 'en',
      components: [{ type: 'BODY', text: 'Hello {{1}}, welcome to our service!' }],
      sampleValues: {}
    });
    setOpenDialog(true);
  };

  const handleEditTemplate = (template) => {
    setDialogType('edit');
    setCurrentTemplate(template);
    setValidationError(null);
    setShowValidationErrors(false);
    
    // Parse components if it's a JSON string
    let components;
    try {
      components = typeof template.components === 'string' 
        ? JSON.parse(template.components) 
        : template.components || [{ type: 'BODY', text: '' }];
    } catch (error) {
      components = [{ type: 'BODY', text: '' }];
    }
    
    // Determine header type and check for existing media
    const headerComponent = components.find(c => c.type === 'HEADER');
    let headerType = 'NONE';
    if (headerComponent) {
      if (headerComponent.format === 'TEXT' || headerComponent.text) {
        headerType = 'TEXT';
      } else if (headerComponent.format) {
        headerType = headerComponent.format;
        // Check if there's an existing media file
        if (headerComponent.example?.header_handle?.[0]) {
          setUploadedFile({
            fileUrl: headerComponent.example.header_handle[0],
            filename: 'Existing media file'
          });
        }
      }
    }
    
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      headerType,
      components,
      sampleValues: (() => {
        try {
          // Parse sampleValues if it's a JSON string
          if (typeof template.sampleValues === 'string') {
            return JSON.parse(template.sampleValues);
          }
          return template.sampleValues || {};
        } catch (error) {
          console.error('Error parsing sampleValues:', error);
          return {};
        }
      })()
    });
    setOpenDialog(true);
  };

  const validateTemplate = () => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    const bodyComponent = components.find(c => c.type === 'BODY');
    const headerComponent = components.find(c => c.type === 'HEADER');
    
    if (!formData.name || formData.name.trim() === '') {
      return 'Template name is required';
    }
    
    // Check if all variables have sample values
    const allVariables = getAllVariables();
    if (allVariables.length > 0) {
      const missingSamples = [];
      allVariables.forEach(variableNumber => {
        const sampleValue = formData.sampleValues[variableNumber];
        if (!sampleValue || sampleValue.trim() === '') {
          missingSamples.push(`{{${variableNumber}}}`);
        }
      });
      
      if (missingSamples.length > 0) {
        return `Please provide sample values for all variables: ${missingSamples.join(', ')}. This is required for Meta template review.`;
      }
    }
    
    if (bodyComponent?.text) {
      const text = bodyComponent.text.trim();
      
      // Check if variables are at start or end
      if (text.match(/^\{\{\d+\}\}/) || text.match(/\{\{\d+\}\}$/)) {
        return 'Variables cannot be at the start or end of the message. Add some text before/after the variable.';
      }
      
      // Check for consecutive variables
      if (text.match(/\{\{\d+\}\}\s*\{\{\d+\}\}/)) {
        return 'Variables cannot be consecutive. Add text between variables.';
      }
      
      // Check variable density
      const variables = text.match(/\{\{(\d+)\}\}/g);
      if (variables) {
        const textWithoutVariables = text.replace(/\{\{\d+\}\}/g, '');
        const variableCount = variables.length;
        const textLength = textWithoutVariables.length;
        
        // Meta's rule: too many variables for message length
        const maxVariablesForLength = Math.floor(textLength / 10);
        
        if (variableCount > maxVariablesForLength && textLength < 30) {
          return `This template has too many variables (${variableCount}) for its length. Reduce the number of variables or increase the message length.`;
        }
        
        // Check minimum text between variables
        const parts = text.split(/\{\{\d+\}\}/);
        for (let i = 1; i < parts.length - 1; i++) {
          if (parts[i].trim().length < 2) {
            return 'There must be at least 2 characters of text between variables.';
          }
        }
        
        // Check first and last parts have sufficient text
        if (parts[0].trim().length < 2) {
          return 'There must be at least 2 characters of text before the first variable.';
        }
        if (parts[parts.length - 1].trim().length < 2) {
          return 'There must be at least 2 characters of text after the last variable.';
        }
      }
    }
    
    // Validate header
    if (headerComponent?.text) {
      const text = headerComponent.text.trim();
      
      if (text.match(/^\{\{\d+\}\}/) || text.match(/\{\{\d+\}\}$/)) {
        return 'Header variables cannot be at the start or end. Add text before/after the variable.';
      }
      
      if (text.match(/\{\{\d+\}\}\s*\{\{\d+\}\}/)) {
        return 'Header variables cannot be consecutive. Add text between variables.';
      }
    }
    
    return null;
  };

  const handleSubmitTemplate = async () => {
    setShowValidationErrors(true);
    
    const validationError = validateTemplate();
    if (validationError) {
      setValidationError(validationError);
      return;
    }
    
    setValidationError(null);
    setLoading(true);
    try {
      const url = dialogType === 'create' 
        ? `${API_BASE_URL}/templates` 
        : `${API_BASE_URL}/templates/${currentTemplate.id || currentTemplate.templateId}`;
      
      const method = dialogType === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setOpenDialog(false);
        setShowValidationErrors(false);
        fetchTemplates();
      } else {
        const err = await response.json();
        setValidationError(`Error: ${err.message || 'Failed to save template'}`);
      }
    } catch (error) {
      console.error('Error submitting template:', error);
      setValidationError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (template) => {
    setDeleteConfirmModal({ open: true, template });
  };

  const confirmDeleteTemplate = async () => {
    const template = deleteConfirmModal.template;
    if (!template) return;
    
    setDeleteConfirmModal({ ...deleteConfirmModal, loading: true });
    
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${template.templateId || template.id}`, { 
        method: 'DELETE',
        credentials: "include"
      });
      if (response.ok) {
        fetchTemplates();
        setDeleteConfirmModal({ open: false, template: null, loading: false });
      } else {
        const error = await response.json();
        alert(`Failed to delete template: ${error.message}`);
        setDeleteConfirmModal({ ...deleteConfirmModal, loading: false });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Network error. Please try again.');
      setDeleteConfirmModal({ ...deleteConfirmModal, loading: false });
    }
  };

  const handleSyncStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/templates/sync`, {
        method: 'POST',
        credentials: "include"
      });
      if (response.ok) {
        fetchTemplates();
        alert('Template statuses synced successfully!');
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
      alert('Failed to sync template statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleUseLibraryTemplate = (libTemplate) => {
    setDialogType('create');
    setCurrentTemplate(null);
    setUploadedFile(null);
    setValidationError(null);
    setShowValidationErrors(false);
    setFormData({
      name: libTemplate.name,
      category: 'AUTHENTICATION',
      language: 'en',
      components: libTemplate.components || [{ type: 'BODY', text: '' }],
      sampleValues: {}
    });
    setOpenDialog(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) {
      // If no file selected (user cancelled), clear the current upload
      setUploadedFile(null);
      // Clear the header component example if it exists
      const components = Array.isArray(formData.components) ? formData.components : [];
      const headerIndex = components.findIndex(c => c.type === 'HEADER');
      if (headerIndex !== -1) {
        updateComponent(headerIndex, 'example', undefined);
      }
      return;
    }
    
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadedFile(result);
        
        // Update header component with uploaded file info
        const components = Array.isArray(formData.components) ? formData.components : [];
        const headerIndex = components.findIndex(c => c.type === 'HEADER');
        if (headerIndex !== -1) {
          updateComponent(headerIndex, 'example', { 
            header_handle: [result.fileUrl || result.filename] 
          });
        }
        
        alert('File uploaded successfully!');
      } else {
        alert('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const addComponent = (type) => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    if (type === 'BUTTONS') {
      const buttonsIndex = components.findIndex(c => c.type === 'BUTTONS');
      if (buttonsIndex === -1) {
        setFormData({
          ...formData,
          components: [...components, { type, buttons: [{ type: 'QUICK_REPLY', text: 'Reply Now' }] }]
        });
      }
    } else if (!components.find(c => c.type === type)) {
      setFormData({
        ...formData,
        components: [...components, { type, text: '' }]
      });
    }
  };

  const updateComponent = (index, field, value) => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    const updatedComponents = [...components];
    updatedComponents[index][field] = value;
    setFormData({ ...formData, components: updatedComponents });
  };

  const removeComponent = (index) => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    const updatedComponents = components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: updatedComponents });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <Check size={14} />;
      case 'IN_REVIEW': return <Clock size={14} />;
      case 'REJECTED': return <AlertCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'approved';
      case 'IN_REVIEW': return 'pending';
      case 'REJECTED': return 'rejected';
      default: return 'pending';
    }
  };

  const filteredTemplates = templates.filter(t => 
    (searchTerm === '' || t.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory === 'ALL' || t.category === filterCategory)
  );

  const getVariablesFromText = (text) => {
    if (!text) return [];
    const matches = text.match(/{{(\d+)}}/g);
    return matches ? matches.map(match => {
      const num = match.match(/\d+/)[0];
      return { placeholder: match, number: parseInt(num) };
    }).sort((a, b) => a.number - b.number) : [];
  };

  const getAllVariables = () => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    const allVariables = new Set();
    
    components.forEach(component => {
      if (component.text) {
        const variables = getVariablesFromText(component.text);
        variables.forEach(v => allVariables.add(v.number));
      }
    });
    
    return Array.from(allVariables).sort((a, b) => a - b);
  };

  const updateSampleValue = (variableNumber, value) => {
    setFormData({
      ...formData,
      sampleValues: {
        ...formData.sampleValues,
        [variableNumber]: value
      }
    });
  };

  const addVariable = (index) => {
    const components = Array.isArray(formData.components) ? formData.components : [];
    const currentText = components[index]?.text || '';
    const existingVariables = getVariablesFromText(currentText);
    const nextVar = existingVariables.length > 0 ? Math.max(...existingVariables.map(v => v.number)) + 1 : 1;
    updateComponent(index, 'text', currentText + ` {{${nextVar}}}`);
  };

  const getCharCount = (text, max) => {
    const count = text ? text.length : 0;
    return (
      <span style={{ fontSize: 11, color: count > max ? '#fa3e3e' : '#8d949e' }}>
        {count}/{max}
      </span>
    );
  };

  const getLanguageLabel = (langCode) => {
    if (!langCode) return 'Unknown';
    const language = languages.find(lang => lang.value === langCode);
    return language ? language.label : langCode;
  };

  // Render WhatsApp Preview
  const renderPreview = () => {
    // Ensure components is an array
    const components = Array.isArray(formData.components) ? formData.components : [];
    
    const header = components.find(c => c.type === 'HEADER');
    const body = components.find(c => c.type === 'BODY');
    const footer = components.find(c => c.type === 'FOOTER');
    const buttons = components.find(c => c.type === 'BUTTONS');

    const formatBody = (text) => {
      if (!text) return '';
      let formattedText = text;
      
      // Replace variables with sample values if available, otherwise keep the variable placeholder
      const variables = getVariablesFromText(text);
      variables.forEach(variable => {
        const sampleValue = formData.sampleValues[variable.number];
        if (sampleValue && sampleValue.trim() !== '') {
          formattedText = formattedText.replace(new RegExp(`\\{\\{${variable.number}\\}\\}`, 'g'), sampleValue);
        }
        // If no sample value provided, keep the variable placeholder as is
      });
      
      // Apply formatting
      return formattedText
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/{{(\d+)}}/g, '<span style="color: #008069; background: #e7f3ef; padding: 0 4px; border-radius: 4px; font-weight: 600;">{{$1}}</span>');
    };

    return (
      <div className="wa-bubble-wrapper">
        <div className="wa-bubble">
          {/* Header Rendering */}
          {formData.headerType === 'TEXT' && header?.text && (
            <div className="wa-header">
              {(() => {
                let headerText = header.text;
                const variables = getVariablesFromText(header.text);
                variables.forEach(variable => {
                  const sampleValue = formData.sampleValues[variable.number];
                  if (sampleValue && sampleValue.trim() !== '') {
                    headerText = headerText.replace(new RegExp(`\\{\\{${variable.number}\\}\\}`, 'g'), sampleValue);
                  }
                });
                return headerText;
              })()} 
            </div>
          )}
          {formData.headerType === 'IMAGE' && (
            uploadedFile ? (
              <img 
                src={`${API_BASE_URL}${uploadedFile.fileUrl}`} 
                alt="Header image" 
                style={{
                  width: '100%', 
                  maxHeight: 180, 
                  objectFit: 'cover', 
                  borderRadius: '6px 6px 0 0',
                  marginBottom: 8
                }}
              />
            ) : (
              <div className="wa-media-placeholder">
                <ImageIcon size={48} color="#8d949e" strokeWidth={1} />
              </div>
            )
          )}
          {formData.headerType === 'VIDEO' && (
            uploadedFile ? (
              <div style={{position: 'relative', width: '100%', maxHeight: 180, marginBottom: 8}}>
                <video 
                  src={`${API_BASE_URL}${uploadedFile.fileUrl}`} 
                  style={{
                    width: '100%', 
                    maxHeight: 180, 
                    objectFit: 'cover', 
                    borderRadius: '6px 6px 0 0'
                  }}
                />
                <div className="play-icon-sim" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}>
                  <Plus size={16} fill="white" />
                </div>
              </div>
            ) : (
              <div className="wa-media-placeholder">
                <div className="play-icon-sim"><Plus size={16} fill="white" /></div>
                <ImageIcon size={48} color="#8d949e" strokeWidth={1} />
              </div>
            )
          )}
          {formData.headerType === 'DOCUMENT' && (
            uploadedFile ? (
              <div className="wa-media-placeholder" style={{background: '#f0f2f5', height: 60, display: 'flex', alignItems: 'center', padding: '0 12px'}}>
                <ImageIcon size={24} color="#8d949e" />
                <div style={{marginLeft: 8, fontSize: 12, color: '#606770'}}>{uploadedFile.originalName || 'Document'}</div>
              </div>
            ) : (
              <div className="wa-media-placeholder" style={{background: '#f0f2f5', height: 60, display: 'flex', alignItems: 'center', padding: '0 12px'}}>
                <ImageIcon size={24} color="#8d949e" />
                <div style={{marginLeft: 8, fontSize: 12, color: '#606770'}}>Document Name.pdf</div>
              </div>
            )
          )}

          {body?.text && <div className="wa-body" dangerouslySetInnerHTML={{ __html: formatBody(body.text) }} />}
          {footer?.text && (
            <div className="wa-footer">{footer.text}</div>
          )}
          <div className="wa-timestamp">
            12:45 PM
            <svg viewBox="0 0 16 11" width="16" height="11" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}} fill="#4fc3f7">
              <path d="M15.01 1.98L14.03 1L6.05 7.98L2.97 4.9L1.99 5.88L6.05 9.94L15.01 1.98Z" />
              <path d="M11.01 1.98L10.03 1L6.05 4.5L2.97 1.4L1.99 2.38L6.05 6.44L11.01 1.98Z" />
            </svg>
          </div>
        </div>
        {buttons?.buttons && (
          <div className="wa-buttons">
            {buttons.buttons.map((btn, i) => (
              <div key={i} className="wa-button">
                {btn.type === 'URL' && <ExternalLink size={12} style={{marginRight: 4, display: 'inline'}} />}
                {btn.text || 'Button Text'}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="template-manager">
      <div className="template-header">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, color: '#606770', fontSize: 13, marginBottom: 4}}>
            <span>WhatsApp Manager</span>
            <ChevronRight size={14} />
            <span>Message Templates</span>
          </div>
          <h1>Message templates</h1>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="btn-primary btn-submit" onClick={handleCreateTemplate} style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <Plus size={18} />
            Create template
          </button>
          <button className="btn-secondary" onClick={handleSyncStatus} style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <Clock size={18} />
            Sync Status
          </button>
        </div>
      </div>

      <div className="template-controls">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by template name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="MARKETING">Marketing</option>
            <option value="UTILITY">Utility</option>
            <option value="AUTHENTICATION">Authentication</option>
          </select>
          <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <Filter size={16} />
            More filters
          </button>
        </div>
      </div>

      <div className="template-tabs">
        <button className={`tab ${selectedTab === 0 ? 'active' : ''}`} onClick={() => setSelectedTab(0)}>
          My templates ({filteredTemplates.length})
        </button>
        <button className={`tab ${selectedTab === 1 ? 'active' : ''}`} onClick={() => setSelectedTab(1)}>
          Template library
        </button>
      </div>

      {selectedTab === 0 && (
        <div className="templates-list-container">
          <table className="templates-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Language</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(template => (
                <tr key={template.id}>
                  <td>
                    <div className="template-name-cell">
                      <span className="template-name" onClick={() => handleEditTemplate(template)} style={{cursor: 'pointer'}}>
                        {template.name}
                      </span>
                      <span className="template-id">ID: {template.id || template.templateId}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-tag" style={{
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      fontSize: 12, 
                      fontWeight: 600,
                      background: categories.find(c => c.value === template.category)?.color || '#f0f2f5'
                    }}>
                      {template.category}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(template.status)}`}>
                      {getStatusIcon(template.status)}
                      <span style={{marginLeft: 6}}>{template.status || 'IN_REVIEW'}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                      <Globe size={14} color="#8d949e" />
                      {getLanguageLabel(template.language)}
                    </div>
                  </td>
                  <td>{template.lastUpdated || template.updatedAt || 'Recently'}</td>
                  <td>
                    <div className="action-btns" style={{display: 'flex', gap: 8}}>
                      <button 
                        className="icon-btn" 
                        title="Edit Template"
                        onClick={() => handleEditTemplate(template)}
                        style={{background: 'none', border: 'none', color: '#008069', cursor: 'pointer'}}
                      >
                        <Layout size={18} />
                      </button>
                      <button 
                        className="icon-btn" 
                        title="Delete Template"
                        onClick={() => handleDeleteTemplate(template)}
                        style={{background: 'none', border: 'none', color: '#fa3e3e', cursor: 'pointer'}}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTemplates.length === 0 && (
            <div style={{padding: 40, textAlign: 'center', color: '#606770'}}>
              <MessageSquare size={48} style={{opacity: 0.2, marginBottom: 16}} />
              <p>No templates found. Create your first one to get started!</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 1 && (
        <div className="library-section">
          {templateLibrary ? (
            Object.keys(templateLibrary).map((catKey) => (
              <div key={catKey} style={{marginBottom: 32}}>
                <h2 style={{fontSize: 18, marginBottom: 16, textTransform: 'capitalize'}}>{catKey} Templates</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20}}>
                  {templateLibrary[catKey].map((libTemplate, idx) => (
                    <div key={idx} className="library-card" style={{
                      background: 'white', 
                      padding: 20, 
                      borderRadius: 12, 
                      border: '1px solid #ebedf0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{fontSize: 16, marginBottom: 8}}>{libTemplate.name}</h3>
                      <p style={{fontSize: 14, color: '#606770', marginBottom: 16, height: 40, overflow: 'hidden'}}>
                        {libTemplate.components?.find(c => c.type === 'BODY')?.text || 'No preview available'}
                      </p>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleUseLibraryTemplate(libTemplate)}
                        style={{width: '100%', fontSize: 13, fontWeight: 600}}
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{padding: 40, textAlign: 'center', color: '#606770'}}>
              <Clock size={48} style={{opacity: 0.2, marginBottom: 16, animation: 'spin 2s linear infinite'}} />
              <p>Loading template library...</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal - Ant Design Style */}
      {deleteConfirmModal.open && (
        <div className="modal-overlay" style={{backgroundColor: 'rgba(0, 0, 0, 0.45)'}}>
          <div className="modal" style={{
            maxWidth: 416,
            minHeight: 'auto',
            padding: 0,
            borderRadius: 6,
            boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(0, 0, 0, 0.88)',
                margin: 0
              }}>
                Delete Template
              </div>
              <button
                onClick={() => setDeleteConfirmModal({ open: false, template: null, loading: false })}
                disabled={deleteConfirmModal.loading}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: deleteConfirmModal.loading ? 'not-allowed' : 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: deleteConfirmModal.loading ? 0.5 : 1
                }}
              >
                <X size={14} color="rgba(0, 0, 0, 0.45)" />
              </button>
            </div>
            
            {/* Body */}
            <div style={{padding: '20px 24px'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
                <div style={{marginTop: 1}}>
                  <svg width="22" height="22" viewBox="0 0 1024 1024" fill="#faad14">
                    <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 0 1 0-96 48.01 48.01 0 0 1 0 96z"/>
                  </svg>
                </div>
                <div style={{flex: 1}}>
                  <div style={{
                    fontSize: 14,
                    color: 'rgba(0, 0, 0, 0.88)',
                    lineHeight: 1.5714,
                    marginBottom: 0
                  }}>
                    Are you sure you want to delete <strong>{deleteConfirmModal.template?.name}</strong>?
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: 'rgba(0, 0, 0, 0.65)',
                    lineHeight: 1.5714,
                    marginTop: 4
                  }}>
                    This action cannot be undone.
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '10px 16px',
              textAlign: 'right',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <button
                onClick={() => setDeleteConfirmModal({ open: false, template: null, loading: false })}
                disabled={deleteConfirmModal.loading}
                style={{
                  height: 32,
                  padding: '4px 15px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  color: 'rgba(0, 0, 0, 0.88)',
                  cursor: deleteConfirmModal.loading ? 'not-allowed' : 'pointer',
                  opacity: deleteConfirmModal.loading ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!deleteConfirmModal.loading) {
                    e.target.style.borderColor = '#4096ff';
                    e.target.style.color = '#4096ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleteConfirmModal.loading) {
                    e.target.style.borderColor = '#d9d9d9';
                    e.target.style.color = 'rgba(0, 0, 0, 0.88)';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                disabled={deleteConfirmModal.loading}
                style={{
                  height: 32,
                  padding: '4px 15px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: '1px solid #ff4d4f',
                  background: '#ff4d4f',
                  color: '#fff',
                  cursor: deleteConfirmModal.loading ? 'not-allowed' : 'pointer',
                  opacity: deleteConfirmModal.loading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  if (!deleteConfirmModal.loading) {
                    e.target.style.background = '#ff7875';
                    e.target.style.borderColor = '#ff7875';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleteConfirmModal.loading) {
                    e.target.style.background = '#ff4d4f';
                    e.target.style.borderColor = '#ff4d4f';
                  }
                }}
              >
                {deleteConfirmModal.loading && (
                  <div style={{
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
                {deleteConfirmModal.loading ? 'Deleting' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <button 
                  onClick={() => {
                    setOpenDialog(false);
                    setValidationError(null);
                  }}
                  style={{background: 'none', border: 'none', cursor: 'pointer', padding: 4}}
                >
                  <X size={20} color="#606770" />
                </button>
                <h2>{dialogType === 'create' ? 'Create a message template' : 'Edit message template'}</h2>
              </div>
              
              {/* Validation Error Display */}
              {validationError && (
                <div style={{
                  background: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: 8,
                  padding: 12,
                  margin: '12px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}>
                  <AlertCircle size={16} color="#721c24" style={{marginTop: 2, flexShrink: 0}} />
                  <div style={{fontSize: 13, color: '#721c24', lineHeight: 1.4}}>
                    <strong>Validation Error:</strong> {validationError}
                  </div>
                  <button 
                    onClick={() => setValidationError(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      marginLeft: 'auto',
                      cursor: 'pointer',
                      color: '#721c24',
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              <div style={{display: 'flex', gap: 12}}>
                <button className="btn-cancel" onClick={() => {
                  setOpenDialog(false);
                  setValidationError(null);
                }}>Cancel</button>
                <button className="btn-submit" onClick={handleSubmitTemplate} disabled={loading}>
                  {loading ? 'Processing...' : (dialogType === 'create' ? 'Finish' : 'Save Changes')}
                </button>
              </div>
            </div>

            <div className="modal-split">
              {/* Form Side */}
              <div className="modal-form-side">
                <div className="section-title">
                  <Layout size={18} />
                  Category & Language
                </div>
                
                <div className="field-group">
                  <label>Select a category</label>
                  <select 
                    className="select-field"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label>Select language</label>
                  <select 
                    className="select-field"
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                  >
                    {languages.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
                  </select>
                  <div style={{fontSize: 12, color: '#8d949e', marginTop: 4}}>
                    Choose the language for your template message.
                  </div>
                </div>

                <div className="field-group">
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <label>Name your template</label>
                    {getCharCount(formData.name, 512)}
                  </div>
                  <input 
                    type="text" 
                    className="input-field"
                    placeholder="e.g. shipping_update"
                    value={formData.name}
                    disabled={dialogType === 'edit'} // Disable name editing during updates
                    onChange={(e) => {
                      if (dialogType === 'create') {
                        setFormData({...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')});
                        // Clear validation error when user starts typing name
                        if (validationError && validationError.includes('Template name is required')) {
                          setValidationError(null);
                        }
                      }
                    }}
                    style={{
                      backgroundColor: dialogType === 'edit' ? '#f5f5f5' : 'white',
                      cursor: dialogType === 'edit' ? 'not-allowed' : 'text',
                      color: dialogType === 'edit' ? '#8d949e' : '#1c1e21'
                    }}
                  />
                  <div style={{fontSize: 12, color: '#8d949e', marginTop: 4}}>
                    {dialogType === 'edit' 
                      ? 'Template name cannot be changed during updates. A new version will be created automatically.' 
                      : 'Use only lowercase letters, numbers, and underscores.'}
                  </div>
                </div>

                <div className="section-title">
                  <Type size={18} />
                  Template Content
                </div>

                {/* Header Section */}
                <div className="component-box">
                  <div style={{marginBottom: 16}}>
                    <label style={{fontWeight: 700, display: 'block', marginBottom: 8}}>Header type</label>
                    <div className="header-type-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8}}>
                      {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map(type => (
                        <button 
                          key={type}
                          className={`header-type-btn ${formData.headerType === type ? 'active' : ''}`}
                          onClick={() => {
                            const components = Array.isArray(formData.components) ? formData.components : [];
                            const headerIndex = components.findIndex(c => c.type === 'HEADER');
                            
                            if (type === 'NONE') {
                              // Remove header component if exists
                              if (headerIndex !== -1) {
                                removeComponent(headerIndex);
                              }
                              setFormData({...formData, headerType: type});
                            } else {
                              // Add or update header component
                              if (headerIndex === -1) {
                                // Add new header component
                                const newComponent = { 
                                  type: 'HEADER', 
                                  format: type === 'TEXT' ? 'TEXT' : type,
                                  text: type === 'TEXT' ? '' : undefined
                                };
                                setFormData({
                                  ...formData, 
                                  headerType: type,
                                  components: [...components, newComponent]
                                });
                              } else {
                                // Update existing header component
                                const updatedComponents = [...components];
                                updatedComponents[headerIndex] = {
                                  ...updatedComponents[headerIndex],
                                  format: type === 'TEXT' ? 'TEXT' : type,
                                  text: type === 'TEXT' ? (updatedComponents[headerIndex].text || '') : undefined
                                };
                                setFormData({
                                  ...formData, 
                                  headerType: type,
                                  components: updatedComponents
                                });
                              }
                            }
                          }}
                        >
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.headerType === 'TEXT') && (
                    <div className="field-group" style={{marginTop: 16}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <label>Header text</label>
                        {getCharCount((Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'HEADER')?.text || '', 60)}
                      </div>
                      <div style={{position: 'relative'}}>
                        <input 
                          ref={(el) => {
                            if (el) {
                              window.headerInputRef = el;
                            }
                          }}
                          type="text" 
                          className="input-field" 
                          placeholder="Add a header text..." 
                          maxLength={60}
                          value={(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'HEADER')?.text || ''}
                          onChange={(e) => {
                            const components = Array.isArray(formData.components) ? formData.components : [];
                            const headerIndex = components.findIndex(c => c.type === 'HEADER');
                            if (headerIndex !== -1) updateComponent(headerIndex, 'text', e.target.value);
                            
                            // Clear validation errors related to header text when user types
                            if (validationError && (
                              validationError.includes('Header variables cannot be at the start or end') ||
                              validationError.includes('Header variables cannot be consecutive')
                            )) {
                              setValidationError(null);
                            }
                          }}
                        />
                        <div style={{display: 'flex', gap: 4, marginTop: 4}}>
                          <button 
                            className="btn-secondary" 
                            style={{fontSize: 10, padding: '2px 6px'}} 
                            onClick={() => {
                              const components = Array.isArray(formData.components) ? formData.components : [];
                              const headerIndex = components.findIndex(c => c.type === 'HEADER');
                              if (headerIndex !== -1) {
                                const input = window.headerInputRef;
                                if (input) {
                                  const currentText = components[headerIndex]?.text || '';
                                  const cursorPosition = input.selectionStart;
                                  const existingVariables = getVariablesFromText(currentText);
                                  const nextVar = existingVariables.length > 0 ? Math.max(...existingVariables.map(v => v.number)) + 1 : 1;
                                  const variableText = `{{${nextVar}}}`;
                                  
                                  const newText = currentText.slice(0, cursorPosition) + variableText + currentText.slice(cursorPosition);
                                  updateComponent(headerIndex, 'text', newText);
                                  
                                  setTimeout(() => {
                                    input.focus();
                                    input.setSelectionRange(cursorPosition + variableText.length, cursorPosition + variableText.length);
                                  }, 0);
                                }
                              }
                            }}
                          >
                            + Var
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.headerType === 'IMAGE' || formData.headerType === 'VIDEO' || formData.headerType === 'DOCUMENT') && (
                    <div className="media-sample-container" style={{marginTop: 16}}>
                      <label style={{fontWeight: 700, display: 'block', marginBottom: 4}}>Media sample <span style={{color: '#8d949e', fontWeight: 400}}>• Optional</span></label>
                      <div style={{fontSize: 12, color: '#8d949e', marginBottom: 8}}>
                        {formData.headerType === 'IMAGE' && 'Supported: JPG, JPEG, PNG, GIF • Max size: 16MB'}
                        {formData.headerType === 'VIDEO' && 'Supported: MP4, AVI, MOV • Max size: 16MB'}
                        {formData.headerType === 'DOCUMENT' && 'Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX • Max size: 16MB'}
                      </div>
                      <input 
                        type="file" 
                        id="media-upload" 
                        style={{display: 'none'}} 
                        accept={
                          formData.headerType === 'IMAGE' ? 'image/jpeg,image/jpg,image/png,image/gif' : 
                          formData.headerType === 'VIDEO' ? 'video/mp4,video/avi,video/mov,video/quicktime' : 
                          'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                        }
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            // Validate file size (16MB)
                            if (file.size > 16 * 1024 * 1024) {
                              alert('File size exceeds 16MB limit');
                              e.target.value = ''; // Reset input
                              return;
                            }
                            handleFileUpload(file);
                          } else {
                            // User cancelled file selection
                            handleFileUpload(null);
                          }
                        }}
                      />
                      <div 
                        className="drag-drop-area" 
                        style={{
                          border: '2px dashed #dddfe2',
                          borderRadius: 8,
                          padding: '32px',
                          textAlign: 'center',
                          background: '#f9fafb',
                          cursor: 'pointer'
                        }}
                        onClick={() => document.getElementById('media-upload').click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#008069';
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#dddfe2';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#dddfe2';
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            handleFileUpload(files[0]);
                          }
                        }}
                      >
                        {uploading ? (
                          <div style={{color: '#008069', marginBottom: 8}}>Uploading...</div>
                        ) : uploadedFile ? (
                          <div style={{position: 'relative'}}>
                            <div style={{color: '#008069', marginBottom: 8}}>✓ {uploadedFile.filename}</div>
                            <div style={{fontSize: 12, color: '#8d949e'}}>Click to change file</div>
                            <button 
                              type="button"
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-8px',
                                width: '20px',
                                height: '20px',
                                padding: '0',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                              onClick={() => {
                                setUploadedFile(null);
                                // Clear the header component example
                                const components = Array.isArray(formData.components) ? formData.components : [];
                                const headerIndex = components.findIndex(c => c.type === 'HEADER');
                                if (headerIndex !== -1) {
                                  updateComponent(headerIndex, 'example', undefined);
                                }
                                // Reset the file input
                                const fileInput = document.getElementById('media-upload');
                                if (fileInput) fileInput.value = '';
                              }}
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{color: '#008069', marginBottom: 8}}><Plus size={24} /></div>
                            <div style={{fontSize: 14, fontWeight: 600}}>Drag and drop to upload</div>
                            <div style={{fontSize: 12, color: '#8d949e'}}>Or choose files on your device</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="component-box">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                    <label style={{fontWeight: 700}}>Body</label>
                    {getCharCount((Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BODY')?.text || '', 1024)}
                  </div>
                  <textarea 
                    ref={(el) => {
                      if (el) {
                        window.bodyTextareaRef = el;
                      }
                    }}
                    className="textarea-field" 
                    placeholder="Enter the body text for your message..."
                    maxLength={1024}
                    value={(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BODY')?.text || ''}
                    onChange={(e) => {
                      const components = Array.isArray(formData.components) ? formData.components : [];
                      const bodyIndex = components.findIndex(c => c.type === 'BODY');
                      if (bodyIndex !== -1) updateComponent(bodyIndex, 'text', e.target.value);
                      
                      // Clear validation errors related to body text when user types
                      if (validationError && (
                        validationError.includes('Variables cannot be at the start or end') ||
                        validationError.includes('Variables cannot be consecutive') ||
                        validationError.includes('too many variables') ||
                        validationError.includes('characters of text between') ||
                        validationError.includes('characters of text before') ||
                        validationError.includes('characters of text after')
                      )) {
                        setValidationError(null);
                      }
                    }}
                  />
                  <div style={{display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
                    <button 
                      className="btn-secondary" 
                      style={{fontSize: 12, padding: '4px 8px'}} 
                      onClick={() => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const bodyIndex = components.findIndex(c => c.type === 'BODY');
                        if (bodyIndex !== -1) {
                          const textarea = window.bodyTextareaRef;
                          if (textarea) {
                            const currentText = components[bodyIndex]?.text || '';
                            const cursorPosition = textarea.selectionStart;
                            const existingVariables = getVariablesFromText(currentText);
                            const nextVar = existingVariables.length > 0 ? Math.max(...existingVariables.map(v => v.number)) + 1 : 1;
                            const variableText = `{{${nextVar}}}`;
                            
                            const newText = currentText.slice(0, cursorPosition) + variableText + currentText.slice(cursorPosition);
                            updateComponent(bodyIndex, 'text', newText);
                            
                            // Set cursor position after the inserted variable
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(cursorPosition + variableText.length, cursorPosition + variableText.length);
                            }, 0);
                          }
                        }
                      }}
                    >
                      + Add Variable
                    </button>
                    
                    {/* Quick insert buttons for common variables */}
                    <button 
                      className="btn-secondary" 
                      style={{fontSize: 12, padding: '4px 8px', background: '#e3f2fd'}} 
                      onClick={() => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const bodyIndex = components.findIndex(c => c.type === 'BODY');
                        if (bodyIndex !== -1) {
                          const textarea = window.bodyTextareaRef;
                          if (textarea) {
                            const currentText = components[bodyIndex]?.text || '';
                            const cursorPosition = textarea.selectionStart;
                            const insertText = '{{1}}';
                            
                            const newText = currentText.slice(0, cursorPosition) + insertText + currentText.slice(cursorPosition);
                            updateComponent(bodyIndex, 'text', newText);
                            
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(cursorPosition + insertText.length, cursorPosition + insertText.length);
                            }, 0);
                          }
                        }
                      }}
                      title="Insert {{1}} at cursor position"
                    >
                      {'{{'}{1}{'}}'}  
                    </button>
                    
                    <button 
                      className="btn-secondary" 
                      style={{fontSize: 12, padding: '4px 8px', background: '#e8f5e8'}} 
                      onClick={() => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const bodyIndex = components.findIndex(c => c.type === 'BODY');
                        if (bodyIndex !== -1) {
                          const textarea = window.bodyTextareaRef;
                          if (textarea) {
                            const currentText = components[bodyIndex]?.text || '';
                            const cursorPosition = textarea.selectionStart;
                            const insertText = '{{2}}';
                            
                            const newText = currentText.slice(0, cursorPosition) + insertText + currentText.slice(cursorPosition);
                            updateComponent(bodyIndex, 'text', newText);
                            
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(cursorPosition + insertText.length, cursorPosition + insertText.length);
                            }, 0);
                          }
                        }
                      }}
                      title="Insert {{2}} at cursor position"
                    >
                      {'{{'}{2}{'}}'}  
                    </button>
                    
                    <button 
                      className="btn-secondary" 
                      style={{fontSize: 12, padding: '4px 8px', background: '#fff8e1'}} 
                      onClick={() => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const bodyIndex = components.findIndex(c => c.type === 'BODY');
                        if (bodyIndex !== -1) {
                          const textarea = window.bodyTextareaRef;
                          if (textarea) {
                            const currentText = components[bodyIndex]?.text || '';
                            const cursorPosition = textarea.selectionStart;
                            const insertText = '{{3}}';
                            
                            const newText = currentText.slice(0, cursorPosition) + insertText + currentText.slice(cursorPosition);
                            updateComponent(bodyIndex, 'text', newText);
                            
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(cursorPosition + insertText.length, cursorPosition + insertText.length);
                            }, 0);
                          }
                        }
                      }}
                      title="Insert {{3}} at cursor position"
                    >
                      {'{{'}{3}{'}}'}  
                    </button>
                  </div>
                  
                  {/* Template validation warning - Removed from here */}

                  {/* Variable usage guide */}
                  <div style={{fontSize: 11, color: '#8d949e', marginTop: 8, padding: 8, background: '#f9fafb', borderRadius: 4}}>
                    💡 <strong>Tip:</strong> Click where you want to insert a variable in the text above, then click "+ Add Variable" or use the quick buttons ({'{{'}{1}{'}}'}  , {'{{'}{2}{'}}'}  , {'{{'}{3}{'}}'}  ).
                  </div>
                </div>

                {/* Variable Samples Section */}
                {getAllVariables().length > 0 && (
                  <div className="component-box">
                    <div style={{marginBottom: 16}}>
                      <label style={{fontWeight: 700, display: 'block', marginBottom: 8}}>Variable samples</label>
                      <div style={{fontSize: 12, color: '#8d949e', marginBottom: 12}}>
                        Include samples of all variables in your message to help Meta review your template. 
                        Remember not to include any customer information to protect your customer's privacy.
                      </div>
                    </div>
                    
                    {getAllVariables().map(variableNumber => {
                      const components = Array.isArray(formData.components) ? formData.components : [];
                      const componentWithVariable = components.find(c => 
                        c.text && c.text.includes(`{{${variableNumber}}}`)
                      );
                      const componentType = componentWithVariable?.type || 'BODY';
                      
                      return (
                        <div key={variableNumber} style={{marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                            <label style={{fontWeight: 600, fontSize: 13}}>
                              {componentType.charAt(0) + componentType.slice(1).toLowerCase()}
                            </label>
                            <span style={{fontSize: 11, color: '#8d949e', background: '#e3f2fd', padding: '2px 6px', borderRadius: 4}}>
                              {'{{'}{variableNumber}{'}}'}  
                            </span>
                          </div>
                          <div style={{fontSize: 12, color: '#606770', marginBottom: 6}}>
                            Enter content for {'{{'}{variableNumber}{'}}'}  
                          </div>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Add sample text"
                            value={formData.sampleValues[variableNumber] || ''}
                            onChange={(e) => {
                              updateSampleValue(variableNumber, e.target.value);
                              
                              // Clear validation error when user starts typing sample values
                              if (validationError && validationError.includes('Please provide sample values for all variables')) {
                                setValidationError(null);
                              }
                            }}
                            style={{
                              fontSize: 13, 
                              padding: 8,
                              border: (showValidationErrors && (!formData.sampleValues[variableNumber] || formData.sampleValues[variableNumber].trim() === '')) 
                                ? '2px solid #ef4444' 
                                : '1px solid #e5e7eb'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="component-box">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                    <label style={{fontWeight: 700}}>Footer (Optional)</label>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'FOOTER') && (
                        <div style={{marginRight: 20, transform: 'translateY(-5px)'}}>
                          {getCharCount((Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'FOOTER').text, 60)}
                        </div>
                      )}
                      {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'FOOTER') && (
                        <button onClick={() => {
                          const components = Array.isArray(formData.components) ? formData.components : [];
                          const footerIndex = components.findIndex(c => c.type === 'FOOTER');
                          if (footerIndex !== -1) removeComponent(footerIndex);
                        }} className="btn-remove-component">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'FOOTER') ? (
                    <button className="btn-add-section" onClick={() => addComponent('FOOTER')}>
                      <Plus size={16} /> Add a footer
                    </button>
                  ) : (
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Add a footer text..." 
                      maxLength={60}
                      value={(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'FOOTER')?.text || ''}
                      onChange={(e) => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const footerIndex = components.findIndex(c => c.type === 'FOOTER');
                        if (footerIndex !== -1) updateComponent(footerIndex, 'text', e.target.value);
                      }}
                    />
                  )}
                </div>

                {/* Variable Samples Section - Removed from here */}

                {/* Buttons */}
                <div className="component-box">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                    <label style={{fontWeight: 700}}>Buttons (Optional)</label>
                    {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BUTTONS') && (
                      <button onClick={() => {
                        const components = Array.isArray(formData.components) ? formData.components : [];
                        const buttonsIndex = components.findIndex(c => c.type === 'BUTTONS');
                        if (buttonsIndex !== -1) removeComponent(buttonsIndex);
                      }} className="btn-remove-component">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {!(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BUTTONS') ? (
                    <button className="btn-add-section" onClick={() => addComponent('BUTTONS')}>
                      <Plus size={16} /> Add interactive buttons
                    </button>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                      {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                        <div key={i} style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                          <select 
                            className="select-field" 
                            style={{width: 140, padding: 8}}
                            value={btn.type}
                            onChange={(e) => {
                              const components = Array.isArray(formData.components) ? formData.components : [];
                              const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                              if (btnIdx !== -1) {
                                const newButtons = [...components[btnIdx].buttons];
                                newButtons[i].type = e.target.value;
                                updateComponent(btnIdx, 'buttons', newButtons);
                              }
                            }}
                          >
                            <option value="QUICK_REPLY">Quick Reply</option>
                            <option value="URL">Call to Action (Link)</option>
                            <option value="PHONE_NUMBER">Call to Action (Phone)</option>
                          </select>
                          <input 
                            type="text" 
                            className="input-field" 
                            style={{flex: 1, padding: 8}}
                            placeholder="Button text..." 
                            value={btn.text}
                            onChange={(e) => {
                              const components = Array.isArray(formData.components) ? formData.components : [];
                              const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                              if (btnIdx !== -1) {
                                const newButtons = [...components[btnIdx].buttons];
                                newButtons[i].text = e.target.value;
                                updateComponent(btnIdx, 'buttons', newButtons);
                              }
                            }}
                          />
                          {btn.type === 'URL' && (
                            <input 
                              type="url" 
                              className="input-field" 
                              style={{flex: 1, padding: 8, marginLeft: 8}}
                              placeholder="https://example.com" 
                              value={btn.url || ''}
                              onChange={(e) => {
                                const components = Array.isArray(formData.components) ? formData.components : [];
                                const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                                if (btnIdx !== -1) {
                                  const newButtons = [...components[btnIdx].buttons];
                                  newButtons[i].url = e.target.value;
                                  updateComponent(btnIdx, 'buttons', newButtons);
                                }
                              }}
                            />
                          )}
                          {btn.type === 'PHONE_NUMBER' && (
                            <input 
                              type="tel" 
                              className="input-field" 
                              style={{flex: 1, padding: 8, marginLeft: 8}}
                              placeholder="+1234567890" 
                              value={btn.phone_number || ''}
                              onChange={(e) => {
                                const components = Array.isArray(formData.components) ? formData.components : [];
                                const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                                if (btnIdx !== -1) {
                                  const newButtons = [...components[btnIdx].buttons];
                                  newButtons[i].phone_number = e.target.value;
                                  updateComponent(btnIdx, 'buttons', newButtons);
                                }
                              }}
                            />
                          )}
                          {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BUTTONS')?.buttons?.length > 1 && (
                            <button 
                              onClick={() => {
                                const components = Array.isArray(formData.components) ? formData.components : [];
                                const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                                if (btnIdx !== -1) {
                                  const newButtons = components[btnIdx].buttons.filter((_, bIdx) => bIdx !== i);
                                  updateComponent(btnIdx, 'buttons', newButtons);
                                }
                              }}
                              style={{background: 'none', border: 'none', color: '#fa3e3e', cursor: 'pointer'}}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {(Array.isArray(formData.components) ? formData.components : []).find(c => c.type === 'BUTTONS')?.buttons?.length < 3 && (
                        <button 
                          className="btn-add-section" 
                          style={{padding: 8, fontSize: 13}}
                          onClick={() => {
                            const components = Array.isArray(formData.components) ? formData.components : [];
                            const btnIdx = components.findIndex(c => c.type === 'BUTTONS');
                            if (btnIdx !== -1) {
                              const newButtons = [...components[btnIdx].buttons, { type: 'QUICK_REPLY', text: '' }];
                              updateComponent(btnIdx, 'buttons', newButtons);
                            }
                          }}
                        >
                          <Plus size={14} /> Add another button
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Side */}
              <div className="modal-preview-side">
                <div style={{width: '100%', marginBottom: 16}}>
                  <span style={{fontSize: 14, fontWeight: 700, color: '#1c1e21'}}>Template preview</span>
                </div>

                <div className="preview-container">
                  <div className="preview-content">
                    {renderPreview()}
                  </div>
                </div>
                
                <div style={{marginTop: 24, fontSize: 13, color: '#606770', textAlign: 'center', maxWidth: 300}}>
                  <AlertCircle size={14} style={{display: 'inline', marginRight: 4, verticalAlign: 'middle'}} />
                  Previews are for illustrative purposes and may vary slightly in the actual application.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;