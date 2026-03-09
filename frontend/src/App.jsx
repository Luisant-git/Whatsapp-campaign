import { useState, useEffect } from "react";
import {
  MessageSquare,
  Settings,
  ChartNoAxesCombined,
  Users,
  Mail,
  Bot,
  Store,
  CreditCard,
  X,
  Menu as MenuIcon,
  UserPlus2,
  List,
  Layers,
  Package,
  ShoppingCart,
  Tag,
  LayoutTemplate,
  Sliders,
  Zap,
  Workflow,
  Calendar,
} from "lucide-react";

import { MENU_CONFIG } from "./config/menuconfig.js"

import { ToastProvider } from "./contexts/ToastContext";
import WhatsAppChat from "./components/WhatsAppChat";
import BulkWhatsApp from "./components/BulkWhatsApps";
import Campaigns from "./components/Campaigns";
import Login from "./components/Login";
import Analytics from "./components/Analytics";
import SettingsPanel from "./components/Settings";
import MasterConfig from "./components/MasterConfig";
import Profile from "./components/Profile";
import AutoReply from "./components/AutoReply";
import QuickReply from "./components/QuickReply";
import Chatbot from "./components/Chatbot";
import Contact from "./components/Contact";
import Subscription from "./components/Subscription";
import Categories from "./components/Categories";
import Products from "./components/Products";
import Orders from "./components/Orders";
import Customers from "./components/Customers";
import Labels from "./components/Labels";
import Blacklist from "./components/BlackList";
import CreateUser from "./components/CreateUser";
import UngroupedContact from "./components/UngroupedContact";
import FlowManager from "./components/FlowManager";
import FlowAppointments from "./components/FlowAppointments";

import "./App.css";
import "./styles/Analytics.css";
import "./styles/Settings.css";
import "./styles/Profile.css";
import { getCurrentPlan } from "./api/subscription";
import { logoutUser, getProfile } from "./api/auth";

// Icon map for MENU_CONFIG.icon
const ICON_MAP = {
  chart: ChartNoAxesCombined,
  chat: MessageSquare,
  users: Users,
  mail: Mail,
  bot: Bot,
  store: Store,
  settings: Settings,
  credit: CreditCard,
  zap: Zap,
  workflow: Workflow,
  calendar: Calendar,
};

// Map MENU_CONFIG keys to activeView values
const MENU_TO_VIEW = {
  analytics: "analytics",
  chats: "chats",

  "contacts.all": "contacts",
  "contacts.blacklist": "blacklist",
  "contacts.ungrouped": "ungroupedcontact",

  "campaigns.bulk": "bulk",
  "campaigns.reports": "campaigns",

  chatbot: "chatbot",
  "quick-reply": "quick-reply",
  "flow-manager": "flow-manager",
  "flow-appointments": "flow-appointments",

  "ecommerce.categories": "categories",
  "ecommerce.products": "products",
  "ecommerce.orders": "orders",
  "ecommerce.customers": "customers",

  "settings.master-config": "master-config",
  "settings.templates": "settings",
  "settings.labels": "labels",
  "settings.createuser": "createuser",

  subscription: "subscription",
};

const CHILD_ICON_MAP = {
  users: Users,
  x: X,
  userPlus: UserPlus2,
  mail: Mail,
  list: List,
  layers: Layers,
  package: Package,
  shoppingCart: ShoppingCart,
  tag: Tag,
  layoutTemplate: LayoutTemplate,
  sliders: Sliders,
  user: Users,
};

function App() {
  const [activeView, setActiveView] = useState("chats");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [aiChatbotEnabled, setAiChatbotEnabled] = useState(false);
  const [useQuickReply, setUseQuickReply] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [ecommerceOpen, setEcommerceOpen] = useState(false);
  const [campaignsOpen, setCampaignsOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // Menu permissions JSON from backend
  const [menuPerms, setMenuPerms] = useState(null);

  // Function to refresh menu permissions
  const refreshMenuPermissions = async () => {
    try {
      const data = await getCurrentPlan();
      console.log("current plan response:", data);
  
      // ✅ only logout if explicitly inactive
      if (data?.isActive === false) {
        handleLogout();
        return;
      }
  
      // menuPermissions may be in different shapes depending on backend
      const permsArray =
        data?.subscription?.menuPermissions ??
        data?.menuPermissions ??
        [];
  
      if (Array.isArray(permsArray)) {
        const permissions = {};
        permsArray.forEach((key) => (permissions[key] = true));
        setMenuPerms(permissions);
      } else {
        setMenuPerms({});
      }
    } catch (err) {
      console.error("Failed to load subscription:", err);
  
      // Optional: don't logout immediately on API error
      // (otherwise you bounce back to Login even if login is OK)
      // handleLogout();
      setMenuPerms(null);
    }
  };

  // Session-based feature flags (AI Chatbot, Quick Reply)
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkSession = async () => {
      try {
        const { checkSessionStatus } = await import("./api/session");
        const sessionData = await checkSessionStatus();

        // Check if chatbot access should be revoked based on menu permissions
        if (activeView === "chatbot" && !isAllowed("chatbot")) {
          setActiveView("analytics");
        }

        // Check if quick-reply access should be revoked based on menu permissions
        if (activeView === "quick-reply" && !isAllowed("quick-reply")) {
          setActiveView("analytics");
        }

        if (sessionData.user?.useQuickReply !== useQuickReply) {
          setUseQuickReply(sessionData.user.useQuickReply !== false);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    checkSession();
  }, [isLoggedIn, activeView, menuPerms, useQuickReply]);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // On mount check session and load profile
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profileData = await getProfile();
        const user = profileData.user;
  
        setUser(user);
        setAiChatbotEnabled(user?.aiChatbotEnabled || false);
        setUseQuickReply(user?.useQuickReply !== false);
        setIsLoggedIn(true);
  
        const userType = profileData.userType || "tenant";
        const permissionMap = profileData.menuPermission?.permission || null;
  
        if (userType === "subuser" && permissionMap) {
          // Subuser: set menuPerms from /user/me
          setMenuPerms(permissionMap);
        } else {
          // Tenant/admin: load from subscription
          await refreshMenuPermissions();
        }
      } catch (error) {
        console.log("Not logged in");
        setIsLoggedIn(false);
        setUser(null);
        setMenuPerms(null);
      }
    };
  
    checkAuth();
  }, []);

  const handleLogin = (user, role, profile) => {
    setUser(user);
    setAiChatbotEnabled(user?.aiChatbotEnabled || false);
    setUseQuickReply(user?.useQuickReply !== false);
    setIsLoggedIn(true);
  
    // reset default view on each login
    setActiveView("analytics");
  
    const userType = profile.userType || "tenant";
    const permissionMap = profile.menuPermission?.permission || null;
  
    if (userType === "subuser" && permissionMap) {
      // Subuser: use menuPermission from /user/me
      setMenuPerms(permissionMap);
    } else {
      // Tenant/owner: use subscription-based permissions
      refreshMenuPermissions();
    }
  };
  

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsLoggedIn(false);
    setUser(null);
    setShowProfileMenu(false);
  
    setActiveView("analytics");
    setMenuPerms(null);
  };

  const handleMenuClick = (view) => {
    setActiveView(view);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Permission check: subscription menuPerms + feature flags
  const isAllowed = (key) => {
    // 1. If menuPerms exists, check admin permissions first
    if (menuPerms && Object.keys(menuPerms).length > 0) {
      if (menuPerms[key] !== true) return false;
    }

    // 2. Then check feature flags for quick-reply only
    if (key === "quick-reply" && useQuickReply === false) return false;

    // 3. If no menuPerms restrictions, allow by default
    return true;
  };

  const renderSidebar = () => (
    <nav className="sidebar-nav">
      {MENU_CONFIG.filter((menu) => isAllowed(menu.key)).map((menu) => {
        const hasChildren = menu.children && menu.children.length > 0;
        const IconComp = ICON_MAP[menu.icon] || Settings;

        if (hasChildren) {
          const isContacts = menu.key === "contacts";
          const isCampaigns = menu.key === "campaigns";
          const isEcommerce = menu.key === "ecommerce";
          const isSettingsGroup = menu.key === "settings";

          const isOpen =
            (isContacts && contactsOpen) ||
            (isCampaigns && campaignsOpen) ||
            (isEcommerce && ecommerceOpen) ||
            (isSettingsGroup && settingsOpen);

          const toggleOpen = () => {
            if (isContacts) setContactsOpen((prev) => !prev);
            if (isCampaigns) setCampaignsOpen((prev) => !prev);
            if (isEcommerce) setEcommerceOpen((prev) => !prev);
            if (isSettingsGroup) setSettingsOpen((prev) => !prev);
          };

          const allowedChildren = (menu.children || []).filter((child) =>
            isAllowed(child.key),
          );

          if (allowedChildren.length === 0) {
            // parent is allowed but no children allowed → hide group
            return null;
          }

          return (
            <div className="nav-item-group" key={menu.key}>
              <button
                className={`nav-item ${isOpen ? "active" : ""}`}
                onClick={toggleOpen}
              >
                <IconComp size={18} />
                <span>{menu.label}</span>
              </button>
              {isOpen && (
                <div className="nav-submenu">
                  {allowedChildren.map((child) => {
                    const viewKey = MENU_TO_VIEW[child.key];
                    if (!viewKey) return null;

                    const ChildIcon =
                      (child.icon && CHILD_ICON_MAP[child.icon]) || null;

                    return (
                      <button
                        key={child.key}
                        className={`nav-subitem ${
                          activeView === viewKey ? "active" : ""
                        }`}
                        onClick={() => handleMenuClick(viewKey)}
                      >
                        {ChildIcon && (
                          <ChildIcon size={16} style={{ marginRight: 6 }} />
                        )}
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const viewKey = MENU_TO_VIEW[menu.key];
        if (!viewKey) return null;

        return (
          <button
            key={menu.key}
            className={`nav-item ${
              activeView === viewKey ? "active" : ""
            }`}
            onClick={() => handleMenuClick(viewKey)}
          >
            <IconComp size={18} />
            <span>{menu.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <ToastProvider>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="dashboard">
          <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
            <div className="sidebar-header">
              <svg viewBox="0 0 24 24" fill="#25d366" width="32" height="32">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <h2>Dashboard</h2>
              <button
                className="menu-toggle sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <X size={20} />
              </button>
            </div>
            {renderSidebar()}
          </div>

          <div className="main-content">
            <div className="header">
              <div className="header-left">
                <button
                  className="menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
                </button>
                <h1>WhatsApp Dashboard</h1>
              </div>
              <div className="profile-dropdown">
                <button
                  className="profile-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
                {showProfileMenu && (
                  <div className="profile-menu">
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setActiveView("profile");
                        setShowProfileMenu(false);
                      }}
                    >
                      My Profile
                    </button>
                    <button
                      className="profile-menu-item"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content based on activeView */}
            {activeView === "chats" && <WhatsAppChat />}
            {activeView === "bulk" && <BulkWhatsApp />}
            {activeView === "contacts" && <Contact />}
            {activeView === "blacklist" && <Blacklist />}
            {activeView === "ungroupedcontact" && <UngroupedContact />}
            {activeView === "labels" && <Labels />}
            {activeView === "createuser" && <CreateUser />}
            {activeView === "campaigns" && <Campaigns />}
            {activeView === "categories" && <Categories />}
            {activeView === "products" && <Products />}
            {activeView === "orders" && <Orders />}
            {activeView === "customers" && <Customers />}
            {activeView === "auto-reply" && <AutoReply />}
            {activeView === "quick-reply" && useQuickReply && <QuickReply />}
            {activeView === "chatbot" && <Chatbot />}
            {activeView === "flow-manager" && <FlowManager />}
            {activeView === "flow-appointments" && <FlowAppointments />}
            {activeView === "analytics" && <Analytics />}
            {activeView === "settings" && (
              <SettingsPanel onNavigate={setActiveView} />
            )}
            {activeView === "master-config" && <MasterConfig />}
            {activeView === "profile" && <Profile />}
            {activeView === "subscription" && <Subscription onSubscriptionChange={refreshMenuPermissions} />}
          </div>
        </div>
      )}
    </ToastProvider>
  );
}

export default App;