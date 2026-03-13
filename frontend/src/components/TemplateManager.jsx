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
  MousePointer2,
  ShieldCheck,
  Settings as SettingsIcon,
  Megaphone,
  CheckCircle2,
  Copy
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
    sampleValues: {}, // Store sample values for variables
    // Authentication template specific fields
    otpType: 'COPY_CODE', // ZERO_TAP, ONE_TAP, COPY_CODE
    packageName: '',
    signatureHash: '',
    zeroTapAgreement: false,
    addSecurityRecommendation: false,
    addExpiryTime: false,
    codeExpiryMinutes: 10,
    customValidityPeriod: false,
    validityPeriod: 10
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
      sampleValues: {},
      // Authentication template specific fields
      otpType: 'COPY_CODE',
      packageName: '',
      signatureHash: '',
      zeroTapAgreement: false,
      addSecurityRecommendation: false,
      addExpiryTime: false,
      codeExpiryMinutes: 10,
      customValidityPeriod: false,
      validityPeriod: 10
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
    
    // Special validation for Authentication templates
    if (formData.category === 'AUTHENTICATION') {
      return validateAuthenticationTemplate(bodyComponent, headerComponent, components);
    }
    
    // Regular validation for other template types
    return validateRegularTemplate(bodyComponent, headerComponent, components);
  };

  const validateAuthenticationTemplate = (bodyComponent, headerComponent, components) => {
    // Meta's Authentication Template Requirements:
    // 1. Fixed preset text with {{1}} parameter
    // 2. Optional security recommendation
    // 3. Optional expiration warning in footer
    // 4. OTP buttons (copy_code, one_tap, zero_tap)
    // 5. No custom text modifications allowed

    // 1. Body component is required
    if (!bodyComponent?.text) {
      return 'Authentication templates must have body text';
    }

    // 2. Must contain {{1}} parameter for OTP
    if (!bodyComponent.text.includes('{{1}}')) {
      return 'Authentication templates must include {{1}} parameter for the verification code';
    }

    // 3. Check for valid authentication text patterns (Meta allows these)
    const text = bodyComponent.text.toLowerCase();
    const validPatterns = [
      'is your verification code',
      'is your login code', 
      'is your password reset code',
      'is your account verification code',
      'verification code is',
      'login code is',
      'password reset code is'
    ];

    const hasValidPattern = validPatterns.some(pattern => text.includes(pattern));
    if (!hasValidPattern) {
      return 'Authentication template must follow Meta\'s format: "{{1}} is your verification code" or similar authentication patterns';
    }

    // 4. Validate OTP-specific button requirements
    const buttonsComponent = components.find(c => c.type === 'BUTTONS');
    if (buttonsComponent?.buttons) {
      const hasValidOtpButton = buttonsComponent.buttons.some(btn => 
        ['OTP', 'QUICK_REPLY'].includes(btn.type) || 
        (btn.otp_type && ['copy_code', 'one_tap', 'zero_tap'].includes(btn.otp_type))
      );
      
      if (!hasValidOtpButton) {
        return 'Authentication templates should have OTP buttons (copy_code, one_tap, or zero_tap)';
      }
    }

    // 5. Validate app configuration for one_tap and zero_tap
    if (formData.otpType === 'ONE_TAP' || formData.otpType === 'ZERO_TAP') {
      if (!formData.packageName || formData.packageName.trim() === '') {
        return 'Package name is required for one-tap and zero-tap authentication';
      }
      
      if (!formData.signatureHash || formData.signatureHash.trim() === '') {
        return 'App signature hash is required for one-tap and zero-tap authentication';
      }
      
      // Validate package name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(formData.packageName)) {
        return 'Package name must have at least two segments separated by dots (e.g., com.example.app)';
      }
      
      // Validate signature hash length
      if (formData.signatureHash.length !== 11) {
        return 'App signature hash must be exactly 11 characters';
      }
      
      // Validate signature hash format
      if (!/^[a-zA-Z0-9+/=]+$/.test(formData.signatureHash)) {
        return 'App signature hash must contain only alphanumeric characters, +, /, or =';
      }
    }

    // 6. Validate zero-tap specific requirements
    if (formData.otpType === 'ZERO_TAP') {
      if (!formData.zeroTapAgreement) {
        return 'You must accept the zero-tap terms to create zero-tap authentication templates';
      }
    }

    // 7. Validate expiration time if set
    if (formData.addExpiryTime) {
      if (!formData.codeExpiryMinutes || formData.codeExpiryMinutes < 1 || formData.codeExpiryMinutes > 90) {
        return 'Code expiration time must be between 1 and 90 minutes';
      }
    }

    // 8. Validate message validity period if custom
    if (formData.customValidityPeriod) {
      if (!formData.validityPeriod || formData.validityPeriod < 1) {
        return 'Custom validity period must be at least 1 minute';
      }
    }

    // 9. Check footer for expiration format if present
    const footerComponent = components.find(c => c.type === 'FOOTER');
    if (footerComponent?.text) {
      const footerText = footerComponent.text.toLowerCase();
      const validFooterPatterns = [
        'expires in',
        'valid for',
        'code expires',
        'this code expires'
      ];
      
      const hasValidFooter = validFooterPatterns.some(pattern => footerText.includes(pattern));
      if (!hasValidFooter) {
        return 'Footer should indicate code expiration time (e.g., "This code expires in X minutes")';
      }
    }

    // 10. Validate header if present (should be minimal for auth templates)
    if (headerComponent?.text) {
      if (headerComponent.text.length > 60) {
        return 'Header text cannot exceed 60 characters';
      }
    }

    // 11. Validate body text length
    if (bodyComponent.text.length > 1024) {
      return 'Body text cannot exceed 1024 characters';
    }

    return null; // All validations passed
  };

  const validateRegularTemplate = (bodyComponent, headerComponent, components) => {
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

  const handleUseLibraryTemplate = async (libTemplate) => {
    setDialogType('create');
    setCurrentTemplate(null);
    setUploadedFile(null);
    setValidationError(null);
    setShowValidationErrors(false);
    
    // Fetch the category automatically based on template name
    let detectedCategory = 'MARKETING'; // default
    try {
      const response = await fetch(`${API_BASE_URL}/templates/template-category/${libTemplate.name}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        detectedCategory = data.category.toUpperCase();
        console.log(`Auto-detected category for ${libTemplate.name}: ${detectedCategory}`);
      }
    } catch (error) {
      console.error('Error fetching template category:', error);
      // Fallback: try to detect from template name using keywords
      const templateName = libTemplate.name.toLowerCase();
      if (['verification_code', 'login_code', 'password_reset', 'account_verification'].includes(templateName) ||
          templateName.includes('verification') || templateName.includes('login') || templateName.includes('otp') || 
          templateName.includes('code') || templateName.includes('auth')) {
        detectedCategory = 'AUTHENTICATION';
      } else if (['order_confirmation', 'shipping_update', 'appointment_reminder', 'payment_confirmation'].includes(templateName) ||
                 templateName.includes('order') || templateName.includes('shipping') || templateName.includes('payment') || 
                 templateName.includes('appointment') || templateName.includes('confirmation')) {
        detectedCategory = 'UTILITY';
      } else {
        detectedCategory = 'MARKETING';
      }
    }
    
    const isAuthTemplate = detectedCategory === 'AUTHENTICATION';
    
    setFormData({
      name: libTemplate.name,
      category: detectedCategory,
      language: 'en',
      components: libTemplate.components || [{ type: 'BODY', text: '' }],
      sampleValues: {},
      // Authentication template specific fields
      otpType: isAuthTemplate ? 'COPY_CODE' : 'COPY_CODE',
      packageName: '',
      signatureHash: '',
      zeroTapAgreement: false,
      addSecurityRecommendation: isAuthTemplate ? true : false,
      addExpiryTime: isAuthTemplate ? false : false,
      codeExpiryMinutes: 10,
      customValidityPeriod: false,
      validityPeriod: 10
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
      });
      
      // Apply formatting
      return formattedText
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/{{(\d+)}}/g, '<span style="color: #008069; background: #e7f3ef; padding: 0 4px; border-radius: 4px; font-weight: 600;">{{$1}}</span>');
    };

    // Generate footer text for authentication templates
    const getAuthFooter = () => {
      if (formData.category === 'AUTHENTICATION' && formData.addExpiryTime) {
        return `This code expires in ${formData.codeExpiryMinutes} minutes.`;
      }
      return footer?.text || '';
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

          {/* Body - Always show for authentication templates or when body text exists */}
          {(body?.text || formData.category === 'AUTHENTICATION') && (
            <div className="wa-body" dangerouslySetInnerHTML={{ 
              __html: formData.category === 'AUTHENTICATION' ? 
                formatBody('{{1}} is your verification code.' + (formData.addSecurityRecommendation ? ' For your security, do not share this code.' : '')) :
                formatBody(body?.text) 
            }} />
          )}
          
          {/* Footer - show auth footer or regular footer */}
          {(getAuthFooter() || footer?.text) && (
            <div className="wa-footer">{getAuthFooter()}</div>
          )}
          
          <div className="wa-timestamp">
            12:45 PM
            <svg viewBox="0 0 16 11" width="16" height="11" style={{marginLeft: 4, display: 'none'}} fill="#4fc3f7">
              <path d="M15.01 1.98L14.03 1L6.05 7.98L2.97 4.9L1.99 5.88L6.05 9.94L15.01 1.98Z" />
              <path d="M11.01 1.98L10.03 1L6.05 4.5L2.97 1.4L1.99 2.38L6.05 6.44L11.01 1.98Z" />
            </svg>
          </div>
          {/* Show authentication buttons or regular buttons inside the bubble */}
          {formData.category === 'AUTHENTICATION' ? (
            <div className="wa-buttons" style={{marginTop: 16, marginLeft: -12, marginRight: -12, marginBottom: -8}}>
              <div className="wa-button">
                {formData.otpType === 'COPY_CODE' ? (
                  <>
                    <Copy size={18} style={{marginRight: 4}} />
                    <span>Copy code</span>
                  </>
                ) : (
                  <>
                    <Smartphone size={18} style={{marginRight: 4}} />
                    <span>Autofill</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            buttons?.buttons && (
              <div className="wa-buttons" style={{marginTop: 16, marginLeft: -12, marginRight: -12, marginBottom: -8}}>
                {buttons.buttons.map((btn, i) => (
                  <div key={i} className="wa-button">
                    {btn.type === 'URL' && <ExternalLink size={16} style={{marginRight: 8}} />}
                    {btn.text || 'Button Text'}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
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
            <div className="library-categories">
              {Object.entries({
                authentication: { label: 'Authentication', color: '#1877f2', desc: 'Securely verify user identity' },
                utility: { label: 'Utility', color: '#008069', desc: 'Send transactional and essential updates' },
                marketing: { label: 'Marketing', color: '#fa3e3e', desc: 'Promote products and drive engagement' }
              }).map(([key, config]) => (
                <div key={key} className="library-category-group">
                  <div className="category-header-main">
                    <h2>{config.label} Templates</h2>
                    <p>{config.desc} • {templateLibrary[key]?.length || 0} templates</p>
                  </div>

                  <div className="library-grid">
                    {templateLibrary[key]?.map((libTemplate, idx) => {
                      const bodyComp = libTemplate.components?.find(c => c.type === 'BODY');
                      const buttonsComp = libTemplate.components?.find(c => c.type === 'BUTTONS');
                      
                      return (
                        <div key={idx} className="library-card-premium">
                          <div className="lib-wa-bubble">
                            {/* Header simulation - using description as header if appropriate or name */}
                            <div className="lib-wa-header-text">
                              {libTemplate.description.split(' with ')[0].split(' for ')[0]}
                            </div>
                            
                            <div className="lib-wa-body-text">
                              {bodyComp?.text.split(/(\{\{\d\}\})/).map((part, i) => 
                                part.match(/\{\{\d\}\}/) ? 
                                  <span key={i} className="lib-variable">{part}</span> : 
                                  part
                              )}
                            </div>
                            
                            <div className="lib-wa-footer-meta">
                              <span className="lib-wa-timestamp">11:24</span>
                            </div>

                            {buttonsComp?.buttons?.map((btn, bidx) => (
                              <div key={bidx} className="lib-wa-cta">
                                {btn.type === 'URL' && <ExternalLink size={14} />}
                                {btn.text}
                              </div>
                            ))}
                            
                            {/* Default button for authentication templates */}
                            {key === 'authentication' && !buttonsComp && (
                              <div className="lib-wa-cta">
                                <ExternalLink size={14} />
                                Verify Account
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: 13, color: '#1c1e21', fontWeight: 700, marginBottom: 20, textAlign: 'left' }}>
                            {libTemplate.name}
                          </div>

                          <div className="lib-bottom-actions">
                            <div className="lib-card-footer-final">
                              <span className="lib-cat-label">{config.label}</span>
                              <button 
                                className="btn-use-lib-primary" 
                                onClick={() => handleUseLibraryTemplate(libTemplate)}
                              >
                                Use Template
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="library-loading-state">
              <div className="loader-circle" style={{ 
                width: 40, 
                height: 40, 
                border: '3px solid #f0f2f5', 
                borderTopColor: '#008069', 
                borderRadius: '50%', 
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p>Fetching from Meta's global library...</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal - Ant Design Style */}
      {deleteConfirmModal.open && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
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

                {/* Authentication Template Special Handling */}
                {formData.category === 'AUTHENTICATION' && (
                  <div className="auth-setup-container" style={{
                    background: '#f8f9fa',
                    border: '1px solid #ebedf0',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 24
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20}}>
                      <div style={{
                        background: '#e7f3ef',
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18
                      }}>🔐</div>
                      <label style={{fontSize: 17, fontWeight: 700, color: '#1c1e21'}}>Authentication Template Setup</label>
                    </div>
                    
                    <div style={{
                      background: 'white',
                      padding: 20,
                      borderRadius: 10,
                      border: '1px solid #ebedf0',
                      marginBottom: 24,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
                        <span style={{fontSize: 16}}>📋</span>
                        <div style={{fontSize: 13, color: '#1c1e21', fontWeight: 600}}>CONTENT RESTRICTIONS</div>
                      </div>
                      <div style={{fontSize: 13, color: '#606770', lineHeight: 1.6}}>
                        <div style={{display: 'flex', gap: 8, marginBottom: 4}}>
                          <span style={{color: '#8d949e'}}>•</span>
                          <span>Content for authentication templates cannot be edited - Meta provides preset text</span>
                        </div>
                        <div style={{display: 'flex', gap: 8, marginBottom: 4}}>
                          <span style={{color: '#8d949e'}}>•</span>
                          <span>Template will use format: <strong>"{"{{1}}"} is your verification code"</strong></span>
                        </div>
                        <div style={{display: 'flex', gap: 8, marginBottom: 4}}>
                          <span style={{color: '#8d949e'}}>•</span>
                          <span>No media, URLs, or emojis allowed</span>
                        </div>
                        <div style={{display: 'flex', gap: 8}}>
                          <span style={{color: '#8d949e'}}>•</span>
                          <span>OTP parameter limited to 15 characters</span>
                        </div>
                      </div>
                    </div>

                    {/* Code Delivery Setup */}
                    <div className="field-group" style={{marginBottom: 28}}>
                      <label style={{fontSize: 15, fontWeight: 700, color: '#1c1e21', display: 'block', marginBottom: 6}}>Code delivery setup</label>
                      <div style={{fontSize: 13, color: '#606770', marginBottom: 16}}>
                        Choose how customers send the code from WhatsApp to your app
                      </div>
                      
                      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                        {[
                          { 
                            id: 'ZERO_TAP', 
                            title: 'Zero-tap auto-fill (Recommended)', 
                            desc: 'Automatically sends code without requiring customer to tap a button. An auto-fill or copy code message will be sent if zero-tap isn\'t possible.' 
                          },
                          { 
                            id: 'ONE_TAP', 
                            title: 'One-tap auto-fill', 
                            desc: 'Code sends to your app when customers tap the button. A copy code message will be sent if auto-fill isn\'t possible.' 
                          },
                          { 
                            id: 'COPY_CODE', 
                            title: 'Copy code', 
                            desc: 'Basic authentication with quick setup. Customers copy and paste the code into your app.' 
                          }
                        ].map(option => (
                          <label key={option.id} style={{
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 12, 
                            cursor: 'pointer', 
                            padding: 16, 
                            border: formData.otpType === option.id ? '2px solid #008069' : '1px solid #ebedf0', 
                            borderRadius: 10, 
                            background: formData.otpType === option.id ? '#f0f9f6' : 'white',
                            transition: 'all 0.2s'
                          }}>
                            <input 
                              type="radio" 
                              name="otpType" 
                              value={option.id}
                              checked={formData.otpType === option.id}
                              onChange={(e) => setFormData({...formData, otpType: e.target.value})}
                              style={{marginTop: 4, accentColor: '#008069'}}
                            />
                            <div>
                              <div style={{fontWeight: 700, fontSize: 14, color: '#1c1e21', marginBottom: 4}}>{option.title}</div>
                              <div style={{fontSize: 12.5, color: '#606770', lineHeight: 1.4}}>
                                {option.desc}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* App Setup for Zero-tap and One-tap */}
                    {(formData.otpType === 'ZERO_TAP' || formData.otpType === 'ONE_TAP') && (
                      <div style={{
                        background: 'white',
                        padding: 20,
                        borderRadius: 10,
                        border: '1px solid #ebedf0',
                        marginBottom: 28
                      }}>
                        <label style={{fontSize: 15, fontWeight: 700, color: '#1c1e21', display: 'block', marginBottom: 6}}>App setup</label>
                        <div style={{fontSize: 13, color: '#606770', marginBottom: 16}}>
                          You can add up to 5 apps. Required for zero-tap and one-tap authentication.
                        </div>
                        
                        <div style={{display: 'flex', gap: 16, marginBottom: 16}}>
                          <div style={{flex: 1.5}}>
                            <label style={{fontSize: 13, fontWeight: 600, color: '#4b4f56', marginBottom: 6, display: 'block'}}>Package name</label>
                            <input 
                              type="text" 
                              className="input-field"
                              placeholder="com.example.myapplication"
                              value={formData.packageName || ''}
                              onChange={(e) => setFormData({...formData, packageName: e.target.value})}
                              maxLength={224}
                              style={{fontSize: 13, padding: '10px 12px'}}
                            />
                            <div style={{fontSize: 11, color: '#8d949e', marginTop: 4}}>{(formData.packageName || '').length}/224</div>
                          </div>
                          <div style={{flex: 1}}>
                            <label style={{fontSize: 13, fontWeight: 600, color: '#4b4f56', marginBottom: 6, display: 'block'}}>App signature hash</label>
                            <input 
                              type="text" 
                              className="input-field"
                              placeholder="K8a/AINcGX7"
                              value={formData.signatureHash || ''}
                              onChange={(e) => setFormData({...formData, signatureHash: e.target.value})}
                              maxLength={11}
                              style={{fontSize: 13, padding: '10px 12px'}}
                            />
                            <div style={{fontSize: 11, color: formData.signatureHash?.length === 11 ? '#008069' : '#fa3e3e', marginTop: 4}}>
                              {formData.signatureHash?.length || 0}/11 {formData.signatureHash?.length !== 11 && '(must be 11 characters)'}
                            </div>
                          </div>
                        </div>
                        
                        {formData.otpType === 'ZERO_TAP' && (
                          <div style={{background: '#fff8e1', padding: 14, borderRadius: 8, border: '1px solid #ffe082'}}>
                            <div style={{display: 'flex', alignItems: 'flex-start', gap: 10}}>
                              <input 
                                type="checkbox" 
                                checked={formData.zeroTapAgreement || false}
                                onChange={(e) => setFormData({...formData, zeroTapAgreement: e.target.checked})}
                                style={{marginTop: 3, accentColor: '#f57c00'}}
                              />
                              <div style={{fontSize: 12.5, color: '#5d4037', lineHeight: 1.5}}>
                                By selecting zero-tap, I understand that <strong>your business</strong>'s use of zero-tap authentication is subject to the 
                                <a href="#" style={{color: '#1976d2', textDecoration: 'none', marginLeft: 4}}>WhatsApp Business Terms of Service</a>. 
                                It's your responsibility to ensure that customers expect the code will be automatically filled in on their behalf.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Content Options */}
                    <div style={{marginBottom: 28}}>
                      <label style={{fontSize: 15, fontWeight: 700, color: '#1c1e21', display: 'block', marginBottom: 12}}>Additional content options</label>
                      
                      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'}}>
                          <input 
                            type="checkbox" 
                            checked={formData.addSecurityRecommendation || false}
                            onChange={(e) => setFormData({...formData, addSecurityRecommendation: e.target.checked})}
                            style={{accentColor: '#008069'}}
                          />
                          <span style={{fontSize: 14, color: '#1c1e21'}}>Add security recommendation</span>
                        </label>
                        
                        <label style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: formData.addExpiryTime ? 8 : 0}}>
                          <input 
                            type="checkbox" 
                            checked={formData.addExpiryTime || false}
                            onChange={(e) => setFormData({...formData, addExpiryTime: e.target.checked})}
                            style={{accentColor: '#008069'}}
                          />
                          <span style={{fontSize: 14, color: '#1c1e21'}}>Add expiry time for the code</span>
                        </label>
                        
                        {formData.addExpiryTime && (
                          <div style={{
                            marginLeft: 26, 
                            padding: '12px 16px', 
                            background: 'white', 
                            borderRadius: 8, 
                            border: '1px solid #ebedf0',
                            maxWidth: 240
                          }}>
                            <label style={{fontSize: 13, fontWeight: 600, color: '#4b4f56', marginBottom: 8, display: 'block'}}>Code expires in</label>
                            <select 
                              className="select-field"
                              value={formData.codeExpiryMinutes || 10}
                              onChange={(e) => setFormData({...formData, codeExpiryMinutes: parseInt(e.target.value)})}
                              style={{padding: '8px 10px', fontSize: 13, border: '1px solid #dddfe2'}}
                            >
                              <option value={1}>1 minute</option>
                              <option value={5}>5 minutes</option>
                              <option value={10}>10 minutes</option>
                              <option value={15}>15 minutes</option>
                              <option value={30}>30 minutes</option>
                              <option value={60}>60 minutes</option>
                              <option value={90}>90 minutes</option>
                            </select>
                            <div style={{fontSize: 11, color: '#8d949e', marginTop: 8}}>
                              After expiry, the auto-fill button will be disabled
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Validity Period */}
                    <div className="validity-period-section">
                      <label style={{fontSize: 15, fontWeight: 700, color: '#1c1e21', display: 'block', marginBottom: 6}}>Message validity period</label>
                      <div style={{fontSize: 13, color: '#606770', marginBottom: 16, lineHeight: 1.4}}>
                        Set a custom validity period that your authentication message must be delivered by before it expires.
                      </div>
                      
                      <label style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12}}>
                        <input 
                          type="checkbox" 
                          checked={formData.customValidityPeriod || false}
                          onChange={(e) => setFormData({...formData, customValidityPeriod: e.target.checked})}
                          style={{accentColor: '#008069'}}
                        />
                        <span style={{fontSize: 14, color: '#1c1e21', fontWeight: 500}}>Set custom validity period for your message</span>
                      </label>
                      
                      {formData.customValidityPeriod ? (
                        <div style={{marginLeft: 26, maxWidth: 220}}>
                          <label style={{fontSize: 13, fontWeight: 600, color: '#4b4f56', marginBottom: 8, display: 'block'}}>Validity period</label>
                          <select 
                            className="select-field"
                            value={formData.validityPeriod || 10}
                            onChange={(e) => setFormData({...formData, validityPeriod: parseInt(e.target.value)})}
                            style={{padding: '8px 10px', fontSize: 13, border: '1px solid #dddfe2'}}
                          >
                            <option value={1}>1 minute</option>
                            <option value={5}>5 minutes</option>
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={360}>6 hours</option>
                            <option value={720}>12 hours</option>
                            <option value={1440}>24 hours</option>
                          </select>
                        </div>
                      ) : (
                        <div style={{
                          marginLeft: 26, 
                          padding: '8px 12px', 
                          background: '#f0f2f5', 
                          borderRadius: 6, 
                          fontSize: 12, 
                          color: '#606770',
                          display: 'inline-block'
                        }}>
                          Standard 10 minutes WhatsApp message validity period will be applied
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show regular template content only for non-authentication templates */}
                {formData.category !== 'AUTHENTICATION' && (
                  <React.Fragment>
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
                  </React.Fragment>
                )}

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