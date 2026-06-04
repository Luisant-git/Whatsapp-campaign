import React, { useState, useEffect } from "react";
import { getMasterConfigs, createMasterConfig, updateMasterConfig, deleteMasterConfig, subscribeToWABA } from "../api/masterConfig";
import { getAllSettings } from "../api/auth";
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from "../api/config";
import { Plus, Trash2, Eye, EyeOff, Wifi, Facebook, X } from "lucide-react";

const MasterConfig = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [masterConfigs, setMasterConfigs] = useState([]);
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
    accessToken: "",
    verifyToken: "",
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [verifyTokenError, setVerifyTokenError] = useState('');
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

  useEffect(() => {
    fetchMasterConfigs();
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
            fetchMasterConfigs(); // Refresh the list
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
    setCurrentConfig({ name: "", phoneNumberId: "", wabaId: "", accessToken: "", verifyToken: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
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
        {masterConfigs.length === 0 ? (
          <p>No configurations found.</p>
        ) : (
          <div className="configurations-grid">
            {masterConfigs.map((config) => (
              <div key={config.id} className="config-card">
                <div className="config-header">
                  <h3>{config.name}</h3>
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
                </div>
                <div className="config-details">
                  <p><strong>Phone ID:</strong> {config.phoneNumberId}</p>
                </div>
                <div className="config-actions">
                  <button onClick={() => handleEdit(config)} className="btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => setSelectedConfig(config)} className="btn-outline">
                    <Eye size={16} /> View Details
                  </button>
                  <button onClick={() => handleDelete(config.id)} className="btn-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
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
                  onChange={(e) => setCurrentConfig({...currentConfig, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phone Number ID *</label>
                <input
                  type="text"
                  placeholder="Enter Phone Number ID"
                  value={currentConfig.phoneNumberId}
                  onChange={(e) => setCurrentConfig({...currentConfig, phoneNumberId: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>WABA ID *</label>
                <input
                  type="text"
                  placeholder="Enter WhatsApp Business Account ID"
                  value={currentConfig.wabaId}
                  onChange={(e) => setCurrentConfig({...currentConfig, wabaId: e.target.value})}
                />
                <small style={{color: '#666', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                  Used for creating templates
                </small>
              </div>
              <div className="form-group">
                <label>App ID *</label>
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
                <label>Access Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    placeholder="Enter Access Token"
                    value={currentConfig.accessToken}
                    onChange={(e) => setCurrentConfig({...currentConfig, accessToken: e.target.value})}
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
                <label>Verify Token *</label>
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
          <div className="modal-content">
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
    </div>
  );
};

export default MasterConfig;