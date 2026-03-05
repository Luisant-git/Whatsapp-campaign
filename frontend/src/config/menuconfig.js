export const MENU_CONFIG = [
    {
      key: "analytics",
      label: "Dashboard",
      icon: "chart",
    },
    {
      key: "chats",
      label: "WhatsApp Chats",
      icon: "chat",
    },
    {
      key: "contacts",
      label: "Contacts",
      icon: "users",
      children: [
        { key: "contacts.all", label: "All Contacts", icon: "users" },
        { key: "contacts.blacklist", label: "Blacklist", icon: "x" },
        { key: "contacts.ungrouped", label: "Ungrouped Contacts", icon: "userPlus" },
      ],
    },
    {
      key: "campaigns",
      label: "Campaigns",
      icon: "mail",
      children: [
        { key: "campaigns.bulk", label: "Compose Campaign", icon: "mail" },
        { key: "campaigns.reports", label: "Campaign Reports", icon: "list" },
      ],
    },
    {
      key: "chatbot",
      label: "AI Chatbot",
      icon: "bot",
    },

    {
      key: "quick-reply",
      label: "Quick Reply",
      icon: "zap",
    },
    {
      key: "flow-manager",
      label: "Flow Manager",
      icon: "workflow",
    },
    {
      key: "flow-appointments",
      label: "Flow Appointments",
      icon: "calendar",
    },

    


    {
      key: "ecommerce",
      label: "E-Commerce",
      icon: "store",
      children: [
        { key: "ecommerce.categories", label: "Categories", icon: "layers" },
        { key: "ecommerce.products", label: "Products", icon: "package" },
        { key: "ecommerce.orders", label: "Orders", icon: "shoppingCart" },
        { key: "ecommerce.customers", label: "Customers", icon: "users" },
      ],
    },
    {
      key: "settings",
      label: "Settings",
      icon: "settings",
      children: [
        { key: "settings.master-config", label: "WhatsApp Setup", icon: "sliders" },
        { key: "settings.templates", label: "Templates", icon: "layoutTemplate" },
        { key: "settings.labels", label: "Labels", icon: "tag" },
        { key: "settings.createuser", label: "Create User", icon: "user" },
      ],
    },
    {
      key: "subscription",
      label: "Subscription",
      icon: "credit",
    },
  ];