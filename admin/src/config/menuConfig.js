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
        { key: "contacts.all", label: "All Contacts" },
        { key: "contacts.blacklist", label: "Blacklist" },
        { key: "contacts.ungrouped", label: "Ungrouped Contacts" },
      ],
    },
    {
      key: "campaigns",
      label: "Campaigns",
      icon: "mail",
      children: [
        { key: "campaigns.bulk", label: "Compose Campaign" },
        { key: "campaigns.reports", label: "Campaign Reports" },
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
        { key: "ecommerce.categories", label: "Categories" },
        { key: "ecommerce.products", label: "Products", children: [
          { key: "ecommerce.products.metacatalog", label: "Meta Catalog" }
        ]},
        { key: "ecommerce.orders", label: "Orders" },
        { key: "ecommerce.customers", label: "Customers" },
      ],
    },
    {
      key: "templates",
      label: "Template Manager",
      icon: "template",
      children: [
        { key: "templates.create", label: "Create Template" },
        { key: "templates.manage", label: "Manage Templates" },
        { key: "templates.library", label: "Template Library" },
        { key: "templates.review", label: "Review Requests" },
      ],
    },
    {
      key: "settings",
      label: "Settings",
      icon: "settings",
      children: [
        { key: "settings.master-config", label: "WhatsApp Setup" },
        { key: "settings.templates", label: "Templates" },
        { key: "settings.labels", label: "Labels" },
        { key: "settings.createuser", label: "Create User" },
      ],
    },
    {
      key: "subscription",
      label: "Subscription",
      icon: "credit",
    },
  ];