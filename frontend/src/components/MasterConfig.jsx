import React, { useState, useEffect } from "react";
import { getMasterConfigs, createMasterConfig, updateMasterConfig, deleteMasterConfig, subscribeToWABA, setAppWebhook } from "../api/masterConfig";
import { getAllSettings } from "../api/auth";
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from "../api/config";
import { Plus, Trash2, Eye, EyeOff, Wifi, Facebook, X } from "lucide-react";

const MasterConfig = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [masterConfigs, setMasterConfigs] = useState([]);
  const [centralConnection, setCentralConnection] = useState(null);
  const [allSettings, setAllSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentConfig, setCurrentConfig] = useState({
    name: "",
    phoneNumberId: "",
    wabaId: "",
    appId: "",
    appSecret: "",
    accessToken: "",
    verifyToken: "",
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [verifyTokenError, setVerifyTokenError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('configurations');
  const [featureAssignments, setFeatureAssignments] = useState({
    whatsappChat: '',
    aiChatbot: '',
    quickReply: '',
    ecommerce: '',
    campaigns: ''
  });
  const [metaCatalogConfig, setMetaCatalogConfig] = useState({
    catalogId: '',
    accessToken: ''
  });
  const [savingMetaCatalog, setSavingMetaCatalog] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showCatalogSelect, setShowCatalogSelect] = useState(false);
  const [availableCatalogs, setAvailableCatalogs] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [catalogUserAccessToken, setCatalogUserAccessToken] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookConfigId, setWebhookConfigId] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState('https://enquiry.api.luisant.cloud/api/webhook');
  const [settingWebhook, setSettingWebhook] = useState(false);

  useEffect(() => {
    fetchMasterConfigs();
    fetchCentralConnection();
    fetchAllSettings();
    fetchFeatureAssignments();
    fetchMetaCatalogConfig();

    // Define the initialization function FIRST
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : '1983839335719624', 
        cookie     : true,
        xfbml      : true,
        version    : 'v20.0'
      });
    };

    // If FB is already loaded (e.g. from hot-reload), initialize immediately
    if (window.FB) {
      window.fbAsyncInit();
    } else {
      // Load the Facebook SDK asynchronously
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    }
  }, []);

  const handleEmbeddedSignup = () => {
    if (!window.FB) {
      showError('Facebook SDK not loaded yet. Please check your internet connection and try again.');
      return;
    }

    // Launch Facebook login
    window.FB.login((response) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        console.log('FB Login response code:', code);
        
        // Use an async IIFE to prevent FB.login from throwing "Expression is of type asyncfunction, not function"
        (async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/master-config/embedded-signup`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code }) 
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.message || 'Failed to complete Meta Embedded Signup');
            }

            showSuccess('Successfully connected to Meta and saved configuration!');
            fetchMasterConfigs(); // Refresh the legacy list
            fetchCentralConnection(); // Refresh the central UI
          } catch (error) {
            console.error("Embedded Signup Error:", error);
            showError(error.message || 'Failed to connect with Meta');
          }
        })();
        
      } else {
        console.log('User cancelled login or did not fully authorize.');
        showError('Meta connection was cancelled or incomplete.');
      }
    }, {
      config_id: '2240746266666915', // WhatsApp Configuration ID
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        feature: 'whatsapp_embedded_signup'
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchFeatureAssignments();
    } else if (activeTab === 'metaCatalog') {
      fetchMetaCatalogConfig();
    }
  }, [activeTab]);

  const fetchCentralConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/master-config/central-connection`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCentralConnection(data);
      }
    } catch (error) {
      console.error("Failed to fetch central connection:", error);
    }
  };

  const [metaTab, setMetaTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchAnalytics = async (monthStr) => {
    if (!centralConnection) return;
    setAnalyticsLoading(true);
    try {
      // monthStr is "YYYY-MM"
      const [year, month] = monthStr.split('-');
      const startDate = new Date(year, parseInt(month) - 1, 1).toISOString();
      const endDate = new Date(year, parseInt(month), 0, 23, 59, 59).toISOString();
      
      const response = await fetch(`${API_BASE_URL}/master-config/central-connection/analytics?start=${startDate}&end=${endDate}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // data.data is the array of data points
        setAnalyticsData(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (centralConnection && centralConnection.connectionStatus === 'CONNECTED') {
      fetchAnalytics(analyticsMonth);
    }
  }, [centralConnection?.id, analyticsMonth]);

  const [syncingCentral, setSyncingCentral] = useState(false);

  const handleSyncCentralConnection = async () => {
    setSyncingCentral(true);
    try {
      const response = await fetch(`${API_BASE_URL}/master-config/central-connection/sync`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCentralConnection(data);
        showSuccess('Successfully synced with Meta!');
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'Failed to sync with Meta');
      }
    } catch (error) {
      console.error("Failed to sync central connection:", error);
      showError('Network error while syncing with Meta');
    } finally {
      setSyncingCentral(false);
    }
  };

  const [disconnectingCentral, setDisconnectingCentral] = useState(false);

  const handleDisconnectCentral = async () => {
    if (!window.confirm("Are you sure you want to disconnect this Meta Account? This will pause all WhatsApp features for your platform.")) {
      return;
    }
    setDisconnectingCentral(true);
    try {
      const response = await fetch(`${API_BASE_URL}/master-config/central-connection`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setCentralConnection(null);
        showSuccess('Disconnected successfully.');
        fetchMasterConfigs(); // Fetch legacy configs just in case
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'Failed to disconnect');
      }
    } catch (error) {
      console.error("Failed to disconnect central connection:", error);
      showError('Network error while disconnecting');
    } finally {
      setDisconnectingCentral(false);
    }
  };

  const fetchMasterConfigs = async () => {
    try {
      const data = await getMasterConfigs();
      setMasterConfigs(data || []);
    } catch (error) {
      console.error("Failed to fetch master configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSettings = async () => {
    try {
      const data = await getAllSettings();
      setAllSettings(data || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchFeatureAssignments = async () => {
    try {
      console.log('Fetching feature assignments from:', `${API_BASE_URL}/settings/feature-assignments`);
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched feature assignments:', data);
        setFeatureAssignments(data || {
          whatsappChat: '',
          aiChatbot: '',
          quickReply: '',
          ecommerce: '',
          campaigns: ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch feature assignments:', error);
    }
  };

  const handleFeatureAssignment = async (feature, phoneNumberId) => {
    const previousAssignments = { ...featureAssignments };
    const updated = { ...featureAssignments, [feature]: phoneNumberId };
    console.log('Saving feature assignment:', { feature, phoneNumberId, updated });
    setFeatureAssignments(updated);
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated)
      });
      
      console.log('Save response status:', response.status);
      const responseData = await response.json();
      console.log('Save response data:', responseData);
      
      if (response.ok) {
        showSuccess(`${feature.replace(/([A-Z])/g, ' $1').trim()} number updated`);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save feature assignment:', error);
      showError('Failed to save assignment');
      setFeatureAssignments(previousAssignments);
    }
  };

  const fetchMetaCatalogConfig = async () => {
    try {
      console.log('Fetching meta catalog config from:', `${API_BASE_URL}/settings/meta-catalog`);
      const response = await fetch(`${API_BASE_URL}/settings/meta-catalog`, {
        credentials: 'include'
      });
      console.log('Meta catalog response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched meta catalog config:', data);
        setMetaCatalogConfig(data || { catalogId: '', accessToken: '' });
      } else {
        console.error('Failed to fetch meta catalog config, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch meta catalog config:', error);
    }
  };

  const handleSaveMetaCatalog = async () => {
    setSavingMetaCatalog(true);
    try {
      console.log('Saving meta catalog config:', metaCatalogConfig);
      const response = await fetch(`${API_BASE_URL}/settings/meta-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(metaCatalogConfig)
      });
      console.log('Save response status:', response.status);
      const responseData = await response.json();
      console.log('Save response data:', responseData);
      if (response.ok) {
        showSuccess('Meta Catalog configuration saved successfully!');
        // Refresh the data after saving
        await fetchMetaCatalogConfig();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save meta catalog config:', error);
      showError('Failed to save Meta Catalog configuration');
    } finally {
      setSavingMetaCatalog(false);
    }
  };

  const handleConnectMetaCatalog = () => {
    if (!window.FB) {
      showError('Facebook SDK not loaded. Please try again.');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        // Call backend to fetch catalogs
        setSavingMetaCatalog(true);
        fetch(`${API_BASE_URL}/settings/meta-catalog/fetch-catalogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userAccessToken: accessToken })
        })
        .then(res => res.json())
        .then(data => {
          if (data.catalogs && data.catalogs.length > 0) {
            setCatalogUserAccessToken(data.longLivedUserToken);
            setAvailableCatalogs(data.catalogs);
            setSelectedCatalogId(data.catalogs[0].id);
            setShowCatalogSelect(true);
          } else {
            showError('No Meta Catalogs found in your Business accounts. Make sure you have created a product catalog.');
          }
        })
        .catch(err => {
          console.error(err);
          showError('Failed to fetch Meta Catalogs.');
        })
        .finally(() => {
          setSavingMetaCatalog(false);
        });
      } else {
        console.log('Login cancelled');
      }
    }, {
      scope: 'catalog_management,business_management'
    });
  };

  const submitAutoConnectCatalog = async () => {
    if (!selectedCatalogId) return;

    setSavingMetaCatalog(true);
    try {
      const config = {
        catalogId: selectedCatalogId,
        accessToken: catalogUserAccessToken
      };
      
      const response = await fetch(`${API_BASE_URL}/settings/meta-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        showSuccess('Meta Catalog successfully auto-connected and saved!');
        setShowCatalogSelect(false);
        await fetchMetaCatalogConfig();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error(error);
      showError('Failed to auto-connect Meta Catalog');
    } finally {
      setSavingMetaCatalog(false);
    }
  };

  const resetForm = () => {
    setCurrentConfig({ name: "", phoneNumberId: "", wabaId: "", appId: "", appSecret: "", accessToken: "", verifyToken: "" });
    setEditingId(null);
    setShowForm(false);
    setFormErrors({});
  };

  const handleSave = async () => {
    const errors = {};
    if (!currentConfig.name) errors.name = true;
    if (!currentConfig.phoneNumberId) errors.phoneNumberId = true;
    if (!currentConfig.wabaId) errors.wabaId = true;
    if (!currentConfig.accessToken) errors.accessToken = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showError('Please fill in all mandatory fields');
      return;
    }

    setSaving(true);
    setVerifyTokenError('');
    try {
      if (editingId) {
        await updateMasterConfig(editingId, currentConfig);
        showSuccess('Master config updated successfully!');
      } else {
        await createMasterConfig(currentConfig);
        showSuccess('Master config created successfully!');
      }
      resetForm();
      fetchMasterConfigs();
    } catch (error) {
      console.error("Failed to save master config:", error);
      const errorMessage = error.message || 'Failed to save master config';
      if (errorMessage.toLowerCase().includes('verify token')) {
        setVerifyTokenError(errorMessage);
      }
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config) => {
    setCurrentConfig({
      name: config.name,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId || "",
      appId: config.appId || "",
      appSecret: config.appSecret || "",
      accessToken: config.accessToken,
      verifyToken: config.verifyToken,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this master config?');
    if (confirmed) {
      try {
        await deleteMasterConfig(id);
        showSuccess('Master config deleted successfully!');
        fetchMasterConfigs();
      } catch (error) {
        console.error("Failed to delete master config:", error);
        showError('Failed to delete master config');
      }
    }
  };

  const handleSubscribeWABA = async (config) => {
    try {
      await subscribeToWABA(config.id);
      showSuccess(`Successfully subscribed ${config.name} to WABA! Webhooks are now active.`);
    } catch (error) {
      console.error("Failed to subscribe to WABA:", error);
      showError(error.message || 'Failed to subscribe to WABA');
    }
  };

  const handleSetWebhookClick = (config) => {
    setWebhookConfigId(config.id);
    setShowWebhookModal(true);
  };

  const submitSetWebhook = async () => {
    if (!callbackUrl) {
      showError('Please enter a callback URL');
      return;
    }
    setSettingWebhook(true);
    try {
      await setAppWebhook(webhookConfigId, callbackUrl);
      showSuccess('Successfully configured App Webhook URL in Meta!');
      setShowWebhookModal(false);
    } catch (error) {
      console.error(error);
      showError(error.message || 'Failed to set app webhook');
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading master configurations...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Configurations</h1>
          <p>Manage WhatsApp API configurations that can be reused across multiple settings.</p>
        </div>
        {activeTab === 'configurations' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-primary" 
              onClick={handleEmbeddedSignup}
              style={{ backgroundColor: '#1877F2', borderColor: '#1877F2', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Facebook size={16} /> Connect with Meta
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Add Configuration
            </button>
          </div>
        )}
      </div>

      <div className="tabs" style={{marginBottom: '24px', borderBottom: '2px solid #e0e0e0'}}>
        <button 
          className={activeTab === 'configurations' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('configurations')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'configurations' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'configurations' ? '600' : '500',
            color: activeTab === 'configurations' ? '#25d366' : '#666'
          }}
        >
          Configurations
        </button>
        <button 
          className={activeTab === 'assignments' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'assignments' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'assignments' ? '600' : '500',
            color: activeTab === 'assignments' ? '#25d366' : '#666'
          }}
        >
          Feature Assignment
        </button>
        <button 
          className={activeTab === 'metaCatalog' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('metaCatalog')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'metaCatalog' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'metaCatalog' ? '600' : '500',
            color: activeTab === 'metaCatalog' ? '#25d366' : '#666'
          }}
        >
          Meta Catalog Configuration
        </button>
      </div>

      {activeTab === 'metaCatalog' && (
        <div className="preference-container">
          <div className="preference-card">
            <div className="preference-header">
              <h2>🛍️ Meta Commerce Catalog Configuration</h2>
              <p>Configure your Meta Catalog ID and Access Token for product catalog integration</p>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px'}}>
              <div className="form-group">
                <label>Meta Catalog ID *</label>
                <input
                  type="text"
                  placeholder="Enter Meta Catalog ID"
                  value={metaCatalogConfig.catalogId}
                  onChange={(e) => setMetaCatalogConfig({...metaCatalogConfig, catalogId: e.target.value})}
                  style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                />
              </div>

              <div className="form-group">
                <label>Meta Access Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showMetaToken ? "text" : "password"}
                    placeholder="Enter Meta Access Token"
                    value={metaCatalogConfig.accessToken}
                    onChange={(e) => setMetaCatalogConfig({...metaCatalogConfig, accessToken: e.target.value})}
                    style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowMetaToken(!showMetaToken)}
                  >
                    {showMetaToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleConnectMetaCatalog}
                  className="btn-primary"
                  style={{ backgroundColor: '#1877F2', borderColor: '#1877F2', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                  disabled={savingMetaCatalog}
                >
                  <Facebook size={16} /> Auto-Connect Meta Catalog
                </button>
                <button 
                  onClick={handleSaveMetaCatalog}
                  disabled={savingMetaCatalog || !metaCatalogConfig.catalogId || !metaCatalogConfig.accessToken}
                  className="btn-secondary"
                  style={{alignSelf: 'flex-start', padding: '12px 24px'}}
                >
                  {savingMetaCatalog ? 'Saving...' : 'Save Manual Configuration'}
                </button>
              </div>
            </div>

            <div className="preference-info" style={{marginTop: '20px'}}>
              <div className="info-icon">ℹ️</div>
              <div className="info-content">
                <strong>Note:</strong> This configuration is used for Meta Commerce Catalog integration. Make sure to use a valid Catalog ID and Access Token from your Meta Business account.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="preference-container">
          <div className="preference-card">
            <div className="preference-header">
              <h2>📱 Feature Phone Number Assignment</h2>
              <p>Select which WhatsApp number handles each feature</p>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>💬</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>One-to-One Chat</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for manual customer support chats</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.whatsappChat || ''}
                  onChange={(e) => handleFeatureAssignment('whatsappChat', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>📢</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Campaigns</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for bulk message campaigns (send-only)</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.campaigns || ''}
                  onChange={(e) => handleFeatureAssignment('campaigns', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>🛒</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Meta Catalog</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for product catalog and ecommerce orders</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.ecommerce || ''}
                  onChange={(e) => handleFeatureAssignment('ecommerce', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>🤖</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>AI Chatbot</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for AI-powered responses</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.aiChatbot || ''}
                  onChange={(e) => handleFeatureAssignment('aiChatbot', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>⚡</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Quick Reply</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for quick reply automation</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.quickReply || ''}
                  onChange={(e) => handleFeatureAssignment('quickReply', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="preference-info" style={{marginTop: '20px'}}>
              <div className="info-icon">ℹ️</div>
              <div className="info-content">
                <strong>How it works:</strong> When a message is received on a specific phone number, it will be routed to the assigned feature. If no assignment is made, the default configuration will handle all features.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configurations' && (
        <div className="settings-list">
          {/* Tech Provider Dashboard Card */}
          <div className="tech-provider-dashboard" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px', padding: '24px', border: '1px solid #bbf7d0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: '1 1 min-content', minWidth: '300px' }}>
                <h2 style={{ color: '#166534', margin: '0 0 12px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Facebook size={24} color="#1877F2" fill="#1877F2" /> Welcome to the WhatsApp Business Platform
                </h2>
                <p style={{ color: '#15803d', margin: '0 0 16px 0', fontSize: '15px', lineHeight: '1.5' }}>
                  Send and receive messages to and from customers using cloud-based servers owned by Meta to host the WhatsApp Business API client.
                </p>
                
                <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1e293b' }}>Configure where you left off</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                    To get alerted when you receive a message or when a message's status has changed, you need to setup a Webhooks endpoint for your app.
                  </p>
                </div>
              </div>

              <div style={{ flex: '1 1 min-content', minWidth: '300px', background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Scale your business</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>Tech Provider Onboarding</span>
                      <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', border: '1px solid #a7f3d0' }}>Verified Tech Provider</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>✓</div>
                      <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '600' }}>Completed Onboarding</span>
                    </div>
                  </div>
                  
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#475569', lineHeight: '1.5', background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                    Congratulations on becoming a WhatsApp Tech Provider. You can now onboard customers to the WhatsApp Business Platform.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* NEW CENTRAL CONNECTION DASHBOARD - COMPACT META STYLE */}
          {centralConnection && (
            <div style={{ 
              marginBottom: '32px', 
              background: '#ffffff', 
              border: '1px solid #ccd0d5', 
              borderRadius: '8px', 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              {/* Header Title & Actions */}
              <div style={{ 
                padding: '20px 24px 16px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#1c1e21', fontWeight: 'bold' }}>WhatsApp Manager</h2>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', background: centralConnection.connectionStatus === 'CONNECTED' ? '#e8fdf0' : '#ffebe8', color: centralConnection.connectionStatus === 'CONNECTED' ? '#1c8c3c' : '#fa383e', borderRadius: '4px' }}>
                    {centralConnection.connectionStatus}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSyncCentralConnection}
                    disabled={syncingCentral}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '6px', cursor: syncingCentral ? 'not-allowed' : 'pointer', background: '#e4e6eb', color: '#1c1e21', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                    Sync Meta API
                  </button>
                  <button 
                    onClick={handleDisconnectCentral}
                    disabled={disconnectingCentral}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '6px', cursor: disconnectingCentral ? 'not-allowed' : 'pointer', background: '#ffffff', color: '#fa383e', border: '1px solid #ccd0d5', transition: 'all 0.2s' }}
                  >
                    Remove Connection
                  </button>
                </div>
              </div>

              {/* Meta-Style Tab Bar */}
              <div style={{ borderBottom: '1px solid #ccd0d5', padding: '0 24px', display: 'flex', gap: '24px' }}>
                <button 
                  onClick={() => setMetaTab('overview')} 
                  style={{ background: 'none', border: 'none', padding: '16px 0', fontSize: '14px', fontWeight: '600', color: metaTab === 'overview' ? '#1877f2' : '#606770', borderBottom: metaTab === 'overview' ? '3px solid #1877f2' : '3px solid transparent', cursor: 'pointer' }}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setMetaTab('phones')} 
                  style={{ background: 'none', border: 'none', padding: '16px 0', fontSize: '14px', fontWeight: '600', color: metaTab === 'phones' ? '#1877f2' : '#606770', borderBottom: metaTab === 'phones' ? '3px solid #1877f2' : '3px solid transparent', cursor: 'pointer' }}
                >
                  Phone numbers
                </button>
                <button 
                  onClick={() => setMetaTab('insights')} 
                  style={{ background: 'none', border: 'none', padding: '16px 0', fontSize: '14px', fontWeight: '600', color: metaTab === 'insights' ? '#1877f2' : '#606770', borderBottom: metaTab === 'insights' ? '3px solid #1877f2' : '3px solid transparent', cursor: 'pointer' }}
                >
                  Insights
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ padding: '24px', background: '#f5f6f7' }}>
                
                {metaTab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {/* Account Details Card */}
                    <div style={{ background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '8px', padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1c1e21' }}>Account details</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#606770', marginBottom: '4px' }}>WhatsApp Business Account ID</div>
                          <div style={{ fontSize: '14px', color: '#1c1e21', fontWeight: '600' }}>{centralConnection.wabaId}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#606770', marginBottom: '4px' }}>Onboarding Status</div>
                          <div style={{ fontSize: '14px', color: '#1c1e21', fontWeight: '600' }}>{centralConnection.onboardingStatus}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#606770', marginBottom: '4px' }}>Total Connected Numbers</div>
                          <div style={{ fontSize: '14px', color: '#1c1e21', fontWeight: '600' }}>{centralConnection.phoneNumbers?.length || 0} numbers</div>
                        </div>
                      </div>
                    </div>

                    {/* Billing Setup Card */}
                    <div style={{ background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '8px', padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1c1e21' }}>Billing</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#606770' }}>Responsibility</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', background: '#f0f2f5', padding: '4px 8px', borderRadius: '4px' }}>
                            {centralConnection.billingAccount?.billingMode === 'CUSTOMER_META' ? 'Customer Managed' : (centralConnection.billingAccount?.billingMode || 'Unconfigured')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#606770' }}>Status</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: centralConnection.billingAccount?.metaBillingStatus === 'ACTIVE' ? '#1c8c3c' : '#1c1e21' }}>
                            {centralConnection.billingAccount?.metaBillingStatus || 'UNKNOWN'}
                          </span>
                        </div>
                        <div style={{ marginTop: '8px', padding: '12px', background: '#f5f6f7', borderRadius: '6px', fontSize: '12px', color: '#606770', lineHeight: '1.4' }}>
                          Your WhatsApp conversations are billed directly by Meta. Access your Meta Business Manager to view invoices, manage credit cards, and check your credit line.
                        </div>
                        <button 
                          onClick={() => window.open(`https://business.facebook.com/wa/manage/home/?waba_id=${centralConnection.wabaId}`, '_blank')}
                          style={{ padding: '8px', fontSize: '14px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', background: '#e4e6eb', color: '#1c1e21', border: 'none', transition: 'background 0.2s' }}
                        >
                          Open Billing Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {metaTab === 'phones' && (
                  <div style={{ background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #ccd0d5' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#1c1e21' }}>Phone numbers</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#606770' }}>Manage routing for your connected numbers.</p>
                    </div>
                    {/* Meta Style Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #ccd0d5', background: '#f5f6f7' }}>
                          <th style={{ padding: '12px 20px', color: '#606770', fontWeight: '600' }}>Number & ID</th>
                          <th style={{ padding: '12px 20px', color: '#606770', fontWeight: '600' }}>Verified Name</th>
                          <th style={{ padding: '12px 20px', color: '#606770', fontWeight: '600' }}>Quality</th>
                          <th style={{ padding: '12px 20px', color: '#606770', fontWeight: '600' }}>App Routing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {centralConnection.phoneNumbers.map((phone, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e4e6eb' }}>
                            <td style={{ padding: '16px 20px' }}>
                              <strong style={{ color: '#1877f2', display: 'block', marginBottom: '4px', fontSize: '14px' }}>{phone.displayNumber || phone.phoneNumberId}</strong>
                              <span style={{ color: '#606770', fontSize: '12px' }}>{phone.phoneNumberId}</span>
                            </td>
                            <td style={{ padding: '16px 20px', color: '#1c1e21', fontWeight: '500' }}>
                              {phone.verifiedName || 'Pending'}
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', background: phone.qualityRating === 'GREEN' ? '#e8fdf0' : '#fff4e5', color: phone.qualityRating === 'GREEN' ? '#1c8c3c' : '#b26a00', borderRadius: '4px' }}>
                                {phone.qualityRating || 'UNKNOWN'}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <select 
                                value={Object.keys(featureAssignments).find(key => featureAssignments[key] === phone.phoneNumberId) || ''}
                                onChange={(e) => { if (e.target.value) handleFeatureAssignment(e.target.value, phone.phoneNumberId); }}
                                style={{ width: '100%', maxWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccd0d5', fontSize: '13px', background: '#ffffff', outline: 'none' }}
                              >
                                <option value="">Unassigned</option>
                                <option value="whatsappChat">Primary Inbox</option>
                                <option value="campaigns">Campaigns</option>
                                <option value="ecommerce">Ecommerce</option>
                                <option value="aiChatbot">AI Chatbot</option>
                                <option value="quickReply">Quick Replies</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {metaTab === 'insights' && (
                  <div style={{ background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '8px' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #ccd0d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1c1e21' }}>Conversation Analytics</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#606770' }}>Billed messages synced directly from Meta.</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#606770' }}>Date range:</span>
                        <input 
                          type="month" 
                          value={analyticsMonth}
                          onChange={(e) => setAnalyticsMonth(e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccd0d5', fontSize: '14px', outline: 'none', color: '#1c1e21' }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ padding: '24px' }}>
                      {analyticsLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#606770', fontSize: '14px' }}>Loading insights...</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          {(() => {
                            const totals = { MARKETING: 0, UTILITY: 0, SERVICE: 0, AUTHENTICATION: 0 };
                            let totalConversations = 0;
                            
                            if (analyticsData && analyticsData.length > 0) {
                              analyticsData.forEach(item => {
                                item.data_points?.forEach(dp => {
                                  const cat = dp.conversation_category;
                                  const count = dp.metrics?.conversation || 0;
                                  if (totals[cat] !== undefined) totals[cat] += count;
                                  else totals[cat] = count;
                                  totalConversations += count;
                                });
                              });
                            }

                            return (
                              <>
                                <div style={{ padding: '24px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#f5f6f7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '13px', color: '#606770', fontWeight: '600', textTransform: 'uppercase' }}>Total Conversations</div>
                                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1c1e21' }}>{totalConversations}</div>
                                </div>
                                <div style={{ padding: '24px', border: '1px solid #e4e6eb', borderRadius: '8px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '13px', color: '#606770', fontWeight: '600', textTransform: 'uppercase' }}>Marketing</div>
                                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1c1e21' }}>{totals.MARKETING || 0}</div>
                                </div>
                                <div style={{ padding: '24px', border: '1px solid #e4e6eb', borderRadius: '8px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '13px', color: '#606770', fontWeight: '600', textTransform: 'uppercase' }}>Service</div>
                                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1c1e21' }}>{totals.SERVICE || 0}</div>
                                </div>
                                <div style={{ padding: '24px', border: '1px solid #e4e6eb', borderRadius: '8px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '13px', color: '#606770', fontWeight: '600', textTransform: 'uppercase' }}>Utility</div>
                                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1c1e21' }}>{totals.UTILITY || 0}</div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* LEGACY MASTER CONFIGS FALLBACK */}
        {!centralConnection && (
          <>
            {masterConfigs.length === 0 ? (
              <p>No legacy configurations found.</p>
            ) : (
          <div className="configurations-grid">
            {masterConfigs.map((config) => (
              <div key={config.id} className="config-card">
                <div className="config-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>{config.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleSubscribeWABA(config)} 
                      className="btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Subscribe app to WABA to receive webhooks"
                    >
                      <Wifi size={14} /> Subscribe
                    </button>
                    <button 
                      onClick={() => handleSetWebhookClick(config)} 
                      className="btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#1877f2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Set Meta App Webhook Callback URL"
                    >
                      <Wifi size={14} /> Set Webhook
                    </button>
                  </div>
                </div>
                <div className="config-details" style={{ marginBottom: '20px' }}>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    <span 
                      onClick={() => {
                        navigator.clipboard.writeText(config.phoneNumberId);
                        showSuccess('Phone ID copied to clipboard!');
                      }}
                      style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '15px', color: '#334155', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      title="Click to copy Phone ID"
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <strong>Phone ID:</strong> {config.phoneNumberId}
                    </span>
                  </p>
                </div>
                <div className="config-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button onClick={() => handleEdit(config)} className="btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => setSelectedConfig(config)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', background: 'white', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', cursor: 'pointer' }}>
                    <Eye size={16} /> View Details
                  </button>
                  <button onClick={() => handleDelete(config.id)} className="btn-danger" style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
      )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingId ? "Edit Configuration" : "Add Configuration"}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Config Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Production API, Test API"
                  value={currentConfig.name}
                  onChange={(e) => {
                    setCurrentConfig({...currentConfig, name: e.target.value});
                    if (formErrors.name) setFormErrors({...formErrors, name: false});
                  }}
                  style={formErrors.name ? { borderColor: '#ef4444' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Phone Number ID *</label>
                <input
                  type="text"
                  placeholder="Enter Phone Number ID"
                  value={currentConfig.phoneNumberId}
                  onChange={(e) => {
                    setCurrentConfig({...currentConfig, phoneNumberId: e.target.value});
                    if (formErrors.phoneNumberId) setFormErrors({...formErrors, phoneNumberId: false});
                  }}
                  style={formErrors.phoneNumberId ? { borderColor: '#ef4444' } : {}}
                />
              </div>
              <div className="form-group">
                <label>WABA ID *</label>
                <input
                  type="text"
                  placeholder="Enter WhatsApp Business Account ID"
                  value={currentConfig.wabaId}
                  onChange={(e) => {
                    setCurrentConfig({...currentConfig, wabaId: e.target.value});
                    if (formErrors.wabaId) setFormErrors({...formErrors, wabaId: false});
                  }}
                  style={formErrors.wabaId ? { borderColor: '#ef4444' } : {}}
                />
                <small style={{color: '#666', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                  Used for creating templates
                </small>
              </div>
              <div className="form-group">
                <label>App ID</label>
                <input
                  type="text"
                  placeholder="Enter Meta App ID"
                  value={currentConfig.appId}
                  onChange={(e) => setCurrentConfig({...currentConfig, appId: e.target.value})}
                />
                <small style={{color: '#666', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                  Required for uploading template media. Find it in <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{color: '#25d366'}}>Meta Developer Console</a>
                </small>
              </div>
              <div className="form-group">
                <label>App Secret</label>
                <div className="input-with-icon">
                  <input
                    type={showAppSecret ? "text" : "password"}
                    placeholder="Enter Meta App Secret"
                    value={currentConfig.appSecret}
                    onChange={(e) => setCurrentConfig({...currentConfig, appSecret: e.target.value})}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                  >
                    {showAppSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Access Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    placeholder="Enter Access Token"
                    value={currentConfig.accessToken}
                    onChange={(e) => {
                      setCurrentConfig({...currentConfig, accessToken: e.target.value});
                      if (formErrors.accessToken) setFormErrors({...formErrors, accessToken: false});
                    }}
                    style={formErrors.accessToken ? { borderColor: '#ef4444' } : {}}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Verify Token</label>
                <div className="input-with-icon">
                  <input
                    type={showVerifyToken ? "text" : "password"}
                    placeholder="Enter Verify Token"
                    value={currentConfig.verifyToken}
                    onChange={(e) => {
                      setCurrentConfig({...currentConfig, verifyToken: e.target.value});
                      setVerifyTokenError('');
                    }}
                    style={verifyTokenError ? {borderColor: '#ef4444'} : {}}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                  >
                    {showVerifyToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {verifyTokenError && (
                  <small style={{color: '#ef4444', fontSize: '12px', fontWeight: '500', display: 'block', marginTop: '4px'}}>
                    {verifyTokenError}
                  </small>
                )}
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={resetForm}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedConfig && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Configuration Details</h2>
              <button onClick={() => setSelectedConfig(null)} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Phone Number ID</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedConfig.phoneNumberId}
                </p>
              </div>
              <div className="form-group">
                <label>WABA ID</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedConfig.wabaId || 'Not configured'}
                </p>
              </div>
              <div className="form-group">
                <label>App ID</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedConfig.appId || 'Not configured'}
                </p>
              </div>
              <div className="form-group">
                <label>App Secret</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedConfig.appSecret ? '••••••••••••••••' : 'Not configured'}
                </p>
              </div>
              <div className="form-group">
                <label>Access Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace', wordBreak: 'break-all'}}>
                  {selectedConfig.accessToken}
                </p>
              </div>
              <div className="form-group">
                <label>Verify Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace'}}>
                  {selectedConfig.verifyToken}
                </p>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setSelectedConfig(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCatalogSelect && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Meta Catalog</h2>
              <button onClick={() => setShowCatalogSelect(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Select the Product Catalog you want to connect for WhatsApp E-Commerce.
              </p>
              <div className="form-group">
                <label>Available Catalogs *</label>
                <select 
                  value={selectedCatalogId} 
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {availableCatalogs.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCatalogSelect(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={submitAutoConnectCatalog} className="btn-primary" disabled={savingMetaCatalog}>
                  {savingMetaCatalog ? 'Connecting...' : 'Connect Catalog'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWebhookModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Set Meta Webhook Callback URL</h2>
              <button onClick={() => setShowWebhookModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                This will update your Meta App's webhook callback URL. Ensure your endpoint is ready to receive webhook verification.
              </p>
              <div className="form-group">
                <label>Callback URL *</label>
                <input
                  type="text"
                  placeholder="https://your-api.com/webhook"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setShowWebhookModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={submitSetWebhook} className="btn-primary" disabled={settingWebhook}>
                  {settingWebhook ? 'Saving...' : 'Set Webhook URL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterConfig;