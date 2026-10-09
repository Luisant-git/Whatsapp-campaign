import React, { useState, useEffect } from "react";
import { getMasterConfigs, createMasterConfig, updateMasterConfig, deleteMasterConfig, subscribeToWABA, setAppWebhook } from "../api/masterConfig";
import { getAllSettings } from "../api/auth";
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from "../api/config";
import { Plus, Trash2, Eye, EyeOff, Wifi, Facebook, X } from "lucide-react";
import { getMetaRate, META_PRICING_SOURCE, META_PRICING_EFFECTIVE_DATE, META_PRICING_RATES } from "../utils/metaPricing";

const MasterConfig = ({ tenantId: propTenantId }) => {
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [recipientMarket, setRecipientMarket] = useState('IN');

  // Tenant detection: Only Tenant 1 is the verified WhatsApp Tech Provider
  const currentTenantId = propTenantId || (() => {
    const tid = localStorage.getItem("tenantId");
    if (tid) return String(tid);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.tenantId) return String(user.tenantId);
      if (localStorage.getItem("userType") === "tenant" && user?.id) return String(user.id);
    } catch (e) {}
    return null;
  })();
  const isTenant1 = String(currentTenantId) === "1" || currentTenantId === 1 || String(currentTenantId) === "tenant-1";

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
        setIsConnecting(true);
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
          } finally {
            setIsConnecting(false);
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

  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const [analyticsRange, setAnalyticsRange] = useState({ label: 'Last 30 days', days: 30 });
  const [analyticsCurrency, setAnalyticsCurrency] = useState('INR');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWabaPicker, setShowWabaPicker] = useState(false);

  const fetchAnalytics = async (range) => {
    if (!centralConnection) return;
    setAnalyticsLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (range.days - 1));
      
      const startDate = start.toISOString();
      const endDate = end.toISOString();
      
      const response = await fetch(`${API_BASE_URL}/master-config/central-connection/analytics?start=${startDate}&end=${endDate}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // data.data is the array of data points
        setAnalyticsData(data.data || []);
        if (data.currency) setAnalyticsCurrency(data.currency);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (centralConnection && centralConnection.connectionStatus === 'CONNECTED') {
      fetchAnalytics(analyticsRange);
    }
  }, [centralConnection?.id, analyticsRange.days]);

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
    const updated = { ...featureAssignments };
    
    // Clear this phone number from any existing features to enforce 1-to-1 routing
    Object.keys(updated).forEach(k => {
      if (updated[k] === phoneNumberId) updated[k] = '';
    });
    
    // Assign to new feature if not "Unassigned" (empty string)
    if (feature) {
      updated[feature] = phoneNumberId;
    }
    
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
        showSuccess(feature ? `${feature.replace(/([A-Z])/g, ' $1').trim()} number updated` : 'Unassigned feature routing');
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
      {isConnecting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', zIndex: 9999, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #1877F2', borderRadius: '50%', width: '50px', height: '50px', animation: 'meta-spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '24px', fontSize: '18px', fontWeight: '600', color: '#1c1e21' }}>Connecting your Meta Account...</p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#606770', maxWidth: '300px', textAlign: 'center' }}>Please wait while we sync your WhatsApp Business Account. This may take a few moments.</p>
          <style>{`
            @keyframes meta-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

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
          {/* Tech Provider Dashboard Card - Only shown for Tenant 1 */}
          {isTenant1 && (
            <div style={{ marginBottom: '24px', background: '#ecfdf5', borderRadius: '6px', padding: '12px 16px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>✓</div>
                <strong style={{ color: '#065f46', fontSize: '14px' }}>Tech Provider Onboarding Complete</strong>
                <span style={{ color: '#047857', fontSize: '14px' }}>- You are a verified WhatsApp Tech Provider.</span>
              </div>
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>Open Meta Platform</a>
            </div>
          )}

          {/* NEW CENTRAL CONNECTION DASHBOARD - COMPACT META STYLE */}
          {centralConnection && (
            <div style={{ 
              marginBottom: '32px', 
              background: '#ffffff', 
              border: '1px solid #ccd0d5', 
              borderRadius: '8px', 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              {/* Header Row */}
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #ccd0d5', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setShowWabaPicker(!showWabaPicker)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #ccd0d5', borderRadius: '4px', background: '#f5f6f7', cursor: 'pointer', minWidth: '280px' }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="#1c1e21"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      <span style={{ fontSize: '15px', color: '#1c1e21', fontWeight: '500', flex: 1 }}>
                        {centralConnection.phoneNumbers[0]?.verifiedName || 'WhatsApp Business Account'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    
                    {showWabaPicker && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: '360px', background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100 }}>
                        <div style={{ padding: '8px' }}>
                          <div style={{ padding: '8px 12px', border: '1px solid #1877f2', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606770" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                            <input type="text" placeholder="Please select a WhatsApp account" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1c1e21' }} />
                          </div>
                        </div>
                        
                        <div style={{ padding: '8px', background: '#e0f0f8', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ marginTop: '2px', width: '16px', height: '16px', borderRadius: '50%', border: '5px solid #1877f2', background: '#fff', flexShrink: 0 }}></div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1c1e21' }}>{centralConnection.phoneNumbers[0]?.verifiedName || 'WhatsApp Business Account'}</div>
                            <div style={{ fontSize: '13px', color: '#606770', marginTop: '2px' }}>ID: {centralConnection.wabaId}</div>
                            <div style={{ fontSize: '13px', color: '#606770', marginTop: '2px' }}>Owned by You</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', background: centralConnection.connectionStatus === 'CONNECTED' ? '#e8fdf0' : '#ffebe8', color: centralConnection.connectionStatus === 'CONNECTED' ? '#1c8c3c' : '#fa383e', borderRadius: '4px', marginLeft: '12px' }}>{centralConnection.connectionStatus}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSyncCentralConnection}
                    disabled={syncingCentral}
                    style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', borderRadius: '4px', cursor: syncingCentral ? 'not-allowed' : 'pointer', background: '#e4e6eb', color: '#1c1e21', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                    Sync
                  </button>
                  <button 
                    onClick={handleDisconnectCentral}
                    disabled={disconnectingCentral}
                    style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', borderRadius: '4px', cursor: disconnectingCentral ? 'not-allowed' : 'pointer', background: '#ffffff', color: '#fa383e', border: '1px solid #fa383e', transition: 'all 0.2s' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              
              {/* Phone Numbers & Billing Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {/* Phone Numbers Column */}
                <div style={{ flex: '1 1 50%', minWidth: '300px', borderRight: '1px solid #ccd0d5', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#606770', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Numbers</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {centralConnection.phoneNumbers.map((phone, idx) => (
                      <div key={idx} style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#f4f7fb', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                          {/* Avatar with WA Badge */}
                          <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f28b82', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5c2223', fontSize: '22px', fontWeight: 'bold' }}>
                              {(phone.verifiedName || phone.displayNumber || '?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', backgroundColor: '#f4f7fb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '16px', height: '16px', backgroundColor: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                              </div>
                            </div>
                          </div>

                          {/* Text Info */}
                          <div style={{ flex: 1 }}>
                            <div 
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', cursor: 'pointer' }}
                              title="Copy to clipboard"
                              onClick={() => {
                                navigator.clipboard.writeText(phone.displayNumber || phone.phoneNumberId);
                              }}
                            >
                              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1c1e21' }}>IN</span>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1c1e21' }}>{phone.displayNumber || phone.phoneNumberId}</span>
                            </div>
                            
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1c1e21', marginBottom: '6px' }}>
                              {phone.verifiedName || 'Pending'}
                            </div>

                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1c1e21' }}>
                              Phone number ID: <span style={{ color: '#005ed6', cursor: 'pointer' }} title="Copy ID" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(phone.phoneNumberId); }}>{phone.phoneNumberId}</span>
                            </div>
                          </div>
                          
                          {/* Quality Badge Top Right */}
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', background: phone.qualityRating === 'GREEN' ? '#e8fdf0' : '#fff4e5', color: phone.qualityRating === 'GREEN' ? '#1c8c3c' : '#b26a00', borderRadius: '4px' }}>
                            {phone.qualityRating || 'UNKNOWN'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Column */}
                <div style={{ flex: '1 1 50%', minWidth: '300px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#606770', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Setup</h4>
                  <div style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '6px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#606770' }}>Responsibility:</span>
                        <strong style={{ color: '#1c1e21' }}>{centralConnection.billingAccount?.billingMode === 'CUSTOMER_META' ? 'Customer Managed' : (centralConnection.billingAccount?.billingMode || 'Unconfigured')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#606770' }}>Payment Method:</span>
                        <strong style={{ color: '#1c1e21' }}>Meta Business Account</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#606770' }}>Status:</span>
                        <strong style={{ color: centralConnection.billingAccount?.metaBillingStatus === 'ACTIVE' ? '#31a24c' : '#1c1e21' }}>{centralConnection.billingAccount?.metaBillingStatus || 'UNKNOWN'}</strong>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => window.open(`https://business.facebook.com/wa/manage/home/?waba_id=${centralConnection.wabaId}`, '_blank')}
                      style={{ marginTop: '16px', width: '100%', padding: '10px 8px', fontSize: '14px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#1877F2', color: 'white', border: '1px solid #1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
                    >
                      <Facebook size={16} /> Manage in Meta
                    </button>
                    
                    {(!centralConnection.billingAccount || centralConnection.billingAccount?.billingMode === 'CUSTOMER_META') && (
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#606770', lineHeight: '1.4' }}>
                        Usage is billed directly by Meta. Invoices and card details are managed in your Meta Business Manager.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Analytics Row */}
              <div style={{ borderTop: '1px solid #ccd0d5', padding: '20px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#606770', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message Pricing & Usage Analytics</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid #ccd0d5', borderRadius: '4px', background: '#ffffff', cursor: 'pointer', fontSize: '14px', color: '#1c1e21', fontWeight: '500' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {analyticsRange.label}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                      </button>

                      {showDatePicker && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', width: '220px', background: '#ffffff', border: '1px solid #ccd0d5', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, padding: '8px 0' }}>
                          {[
                            { label: 'Last 7 days', days: 7 },
                            { label: 'Last 30 days', days: 30 },
                            { label: 'Last 60 days', days: 60 },
                            { label: 'Last 90 days', days: 90 }
                          ].map(range => (
                            <div 
                              key={range.label}
                              onClick={() => { setAnalyticsRange(range); setShowDatePicker(false); }}
                              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: analyticsRange.label === range.label ? '#f5f6f7' : 'transparent' }}
                            >
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: analyticsRange.label === range.label ? '5px solid #1877f2' : '1px solid #ccd0d5', background: '#fff' }}></div>
                              <span style={{ fontSize: '14px', color: '#1c1e21' }}>{range.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {analyticsLoading && <span style={{ fontSize: '12px', color: '#1877f2', fontWeight: '600' }}>Loading...</span>}
                  </div>
                </div>

                {/* Recipient Market Selector */}
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f5f6f7', borderRadius: '8px', border: '1px solid #ccd0d5' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c1e21' }}>Recipient Market:</div>
                  <select 
                    value={recipientMarket}
                    onChange={(e) => setRecipientMarket(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccd0d5', fontSize: '14px', background: '#ffffff', cursor: 'pointer', outline: 'none' }}
                  >
                    {Object.keys(META_PRICING_RATES).map(code => (
                      <option key={code} value={code}>{META_PRICING_RATES[code].name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#606770', marginLeft: 'auto', textAlign: 'right' }}>
                    Rates effective from <strong>{META_PRICING_EFFECTIVE_DATE}</strong>. <br/>
                    <a href={META_PRICING_SOURCE} target="_blank" rel="noreferrer" style={{ color: '#1877f2', textDecoration: 'none' }}>View Official Meta Rate Card</a>
                  </div>
                </div>
                
                <div style={{ padding: '0 0 16px 0' }}>
                  {(() => {
                    let totalDelivered = 0;
                    let totalCost = 0;
                    let hasMissingCost = false;
                    
                    const rowsMap = new Map();

                    if (analyticsData && analyticsData.length > 0) {
                      analyticsData.forEach(item => {
                        item.data_points?.forEach(dp => {
                          const rawCat = (
                            dp.pricing_category || dp.conversation_category || 
                            item.dimensions?.PRICING_CATEGORY || item.dimensions?.CONVERSATION_CATEGORY || 
                            item.pricing_category || item.conversation_category || ''
                          ).toUpperCase();
                          const cat = rawCat.includes('MARKETING') ? 'MARKETING' : rawCat.includes('AUTH') ? 'AUTHENTICATION' : rawCat.includes('UTIL') ? 'UTILITY' : rawCat.includes('SERV') ? 'SERVICE' : rawCat || 'UNKNOWN';

                          const country = item.dimensions?.COUNTRY || dp.dimensions?.COUNTRY || dp.country || 'Unknown';
                          const tier = item.dimensions?.TIER || dp.dimensions?.TIER || dp.tier || (cat === 'SERVICE' ? 'N/A' : 'Unknown');

                          const count = typeof dp.volume === 'number' ? dp.volume : typeof dp.conversation === 'number' ? dp.conversation : typeof dp.delivered === 'number' ? dp.delivered : typeof dp.metrics?.conversation === 'number' ? dp.metrics.conversation : typeof dp.metrics?.delivered === 'number' ? dp.metrics.delivered : 0;
                          
                          let cost = undefined;
                          if (typeof dp.cost === 'number') cost = dp.cost;
                          else if (typeof dp.amount_spent === 'number') cost = dp.amount_spent;
                          else if (typeof dp.amountSpent === 'number') cost = dp.amountSpent;
                          else if (dp.cost && typeof dp.cost.amount_spent === 'number') cost = dp.cost.amount_spent;
                          else if (typeof dp.metrics?.cost === 'number') cost = dp.metrics.cost;
                          else if (typeof dp.metrics?.amount_spent === 'number') cost = dp.metrics.amount_spent;

                          if (count > 0 && cost === undefined) {
                            hasMissingCost = true;
                          }

                          const key = `${cat}_${country}_${tier}`;
                          if (!rowsMap.has(key)) {
                            rowsMap.set(key, { category: cat, country, tier, messages: 0, spend: 0, hasSpend: false });
                          }
                          const row = rowsMap.get(key);
                          row.messages += count;
                          if (cost !== undefined) {
                            row.spend += cost;
                            row.hasSpend = true;
                          }

                          totalDelivered += count;
                          if (cost !== undefined) {
                            totalCost += cost;
                          }
                        });
                      });
                    }

                    const rows = Array.from(rowsMap.values()).sort((a, b) => a.category.localeCompare(b.category));
                    const currencySymbol = analyticsCurrency === 'INR' ? '₹' : (analyticsCurrency || '₹');
                    
                    const getPublishedRate = (marketCode, cat) => {
                      if (cat === 'SERVICE') return 'Free (Service)';
                      // If the API didn't return a country, we use the fallback dropdown selected by user
                      const actualMarket = marketCode !== 'Unknown' ? marketCode : recipientMarket;
                      const metaRate = getMetaRate(actualMarket, cat);
                      if (metaRate && metaRate.rate !== undefined && metaRate.rate !== null) {
                        const symbol = metaRate.currency === 'INR' ? '₹' : metaRate.currency === 'USD' ? '$' : metaRate.currency === 'GBP' ? '£' : metaRate.currency === 'BRL' ? 'R$' : metaRate.currency;
                        return `${symbol} ${metaRate.rate.toFixed(4)} / msg`;
                      }
                      return 'Pricing unavailable';
                    };

                    const formatCategory = (cat) => {
                      if (cat === 'MARKETING') return 'Marketing';
                      if (cat === 'UTILITY') return 'Utility';
                      if (cat === 'AUTHENTICATION') return 'Authentication';
                      if (cat === 'SERVICE') return 'Service';
                      return cat;
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#606770', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Messages Delivered</div>
                          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1c1e21' }}>{totalDelivered}</div>
                        </div>

                        <div style={{ border: '1px solid #ccd0d5', borderRadius: '8px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead style={{ background: '#f5f6f7', borderBottom: '1px solid #ccd0d5' }}>
                              <tr>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600' }}>Category</th>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600' }}>Market</th>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600' }}>Tier</th>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600', textAlign: 'right' }}>Messages</th>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600', textAlign: 'right' }}>Unit Rate</th>
                                <th style={{ padding: '12px 16px', color: '#606770', fontWeight: '600', textAlign: 'right' }}>Actual Spend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#606770' }}>No analytics data available for this period.</td>
                                </tr>
                              ) : rows.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < rows.length - 1 ? '1px solid #e4e6eb' : 'none' }}>
                                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1c1e21' }}>{formatCategory(row.category)}</td>
                                  <td style={{ padding: '12px 16px', color: '#1c1e21' }}>{row.country}</td>
                                  <td style={{ padding: '12px 16px', color: '#1c1e21' }}>{row.tier}</td>
                                  <td style={{ padding: '12px 16px', color: '#1c1e21', textAlign: 'right' }}>{row.messages}</td>
                                  <td style={{ padding: '12px 16px', color: '#606770', textAlign: 'right' }}>{getPublishedRate(row.country, row.category)}</td>
                                  <td style={{ padding: '12px 16px', color: '#1c1e21', textAlign: 'right' }}>
                                    {!row.hasSpend ? (
                                      <span style={{ color: '#d97706' }}>Pending / Unavailable</span>
                                    ) : (
                                      row.spend === 0 ? <span style={{ color: '#047857' }}>{currencySymbol} 0.00</span> : `${currencySymbol} ${row.spend.toFixed(2)}`
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot style={{ background: '#f8f9fa', borderTop: '2px solid #ccd0d5' }}>
                              <tr>
                                <td colSpan={5} style={{ padding: '16px', fontWeight: 'bold', color: '#1c1e21', fontSize: '15px' }}>Total Actual Spend (Meta Reported)</td>
                                <td style={{ padding: '16px', fontWeight: 'bold', textAlign: 'right', fontSize: '15px' }}>
                                  {hasMissingCost ? (
                                    <span style={{ color: '#d97706', fontSize: '14px', fontWeight: '500' }}>Pending / Unavailable</span>
                                  ) : (
                                    <span style={{ color: '#047857' }}>{currencySymbol} {totalCost.toFixed(2)}</span>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#606770', flexWrap: 'wrap', gap: '8px' }}>
                          <div>* Actual Meta spend may be delayed or unavailable. A missing cost value does not mean the messages were free. Zero cost is shown only when explicitly reported by Meta or confirmed by applicable pricing rules. Estimates are indicative and are not an official invoice.</div>
                          <a href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View current pricing <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </a>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        {/* LEGACY MASTER CONFIGS FALLBACK */}
        {!centralConnection && (
          <>
            {masterConfigs.length === 0 ? (
              <p>No legacy configurations found.</p>
            ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {masterConfigs.map((config) => (
              <div key={config.id} style={{ padding: '16px', border: '1px solid #ccd0d5', borderRadius: '8px', background: '#f4f7fb', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Avatar with WA Badge */}
                  <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f28b82', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5c2223', fontSize: '22px', fontWeight: 'bold' }}>
                      {(config.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', backgroundColor: '#f4f7fb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Text Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1c1e21', marginBottom: '4px' }}>
                      {config.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#1c1e21', marginBottom: '10px' }}>
                      Phone number ID: <span style={{ color: '#005ed6', cursor: 'pointer' }} title="Copy ID" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(config.phoneNumberId); showSuccess('Phone ID copied to clipboard!'); }}>{config.phoneNumberId}</span>
                    </div>

                    {/* Primary Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSubscribeWABA(config)} style={{ padding: '4px 10px', fontSize: '12px', background: '#25d366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Subscribe</button>
                      <button onClick={() => handleSetWebhookClick(config)} style={{ padding: '4px 10px', fontSize: '12px', background: '#1877f2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Set Webhook</button>
                    </div>
                  </div>
                </div>

                {/* Legacy Actions */}
                <div style={{ display: 'flex', gap: '8px', width: '100%', borderTop: '1px solid #ccd0d5', paddingTop: '12px' }}>
                    <button onClick={() => handleEdit(config)} style={{ flex: 1, padding: '6px 12px', fontSize: '13px', background: '#e4e6eb', color: '#1c1e21', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Edit</button>
                    <button onClick={() => setSelectedConfig(config)} style={{ flex: 1, padding: '6px 12px', fontSize: '13px', background: '#e4e6eb', color: '#1c1e21', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Details</button>
                    <button onClick={() => handleDelete(config.id)} style={{ padding: '6px 12px', fontSize: '13px', background: '#ffebe8', color: '#fa383e', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={14} />
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