/**
 * Bilingual strings (English / Hindi) for Chalu.
 * Hindi uses IBM Plex Sans Devanagari (`.deva` class). Toggle is global via localeStore.
 */
export type Locale = "en" | "hi";

export const STRINGS = {
  // brand / nav
  brand: { en: "Chalu", hi: "चालू" },
  tagline: {
    en: "Live kitchen ops — no gap between the menu and the pan.",
    hi: "लाइव किचन ऑप्स — मेनू और कड़ाही के बीच कोई गैप नहीं।",
  },
  nav_menu: { en: "Menu", hi: "मेनू" },
  nav_orders: { en: "My Order", hi: "मेरा ऑर्डर" },
  nav_kitchen: { en: "Kitchen", hi: "रसोई" },
  nav_dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  nav_tables: { en: "Tables", hi: "टेबल" },
  nav_inventory: { en: "Inventory", hi: "इन्वेंट्री" },
  nav_staff: { en: "Staff", hi: "स्टाफ" },
  nav_customers: { en: "Customers", hi: "ग्राहक" },
  nav_sales: { en: "Sales", hi: "बिक्री" },
  nav_analytics: { en: "Analytics", hi: "विश्लेषण" },
  nav_login: { en: "Log in", hi: "लॉगिन" },
  nav_logout: { en: "Log out", hi: "लॉगआउट" },

  // categories
  cat_starters: { en: "Starters", hi: "स्टार्टर्स" },
  cat_mains: { en: "Mains", hi: "मेन कोर्स" },
  cat_breads: { en: "Breads", hi: "रोटी / ब्रेड" },
  cat_rice: { en: "Rice & Biryani", hi: "चावल और बिरयानी" },
  cat_desserts: { en: "Desserts", hi: "मिठाई" },
  cat_beverages: { en: "Beverages", hi: "पेय" },
  cat_all: { en: "All", hi: "सभी" },

  // status stamps
  status_new: { en: "New", hi: "नया" },
  status_cooking: { en: "Cooking", hi: "बन रहा" },
  status_ready: { en: "Ready", hi: "तैयार" },
  status_served: { en: "Served", hi: "परोसा" },
  status_86: { en: "86'd", hi: "खत्म" },
  status_bestseller: { en: "Bestseller", hi: "बेस्टसेलर" },
  status_low: { en: "Low stock", hi: "कम स्टॉक" },
  status_out: { en: "Out of stock", hi: "स्टॉक खत्म" },
  status_veg: { en: "Veg", hi: "शाकाहारी" },
  status_nonveg: { en: "Non-veg", hi: "मांसाहारी" },

  // actions
  act_add: { en: "Add", hi: "जोड़ें" },
  act_add_to_cart: { en: "Add to order", hi: "ऑर्डर में जोड़ें" },
  act_remove: { en: "Remove", hi: "हटाएं" },
  act_send_kitchen: { en: "Send to kitchen", hi: "रसोई में भेजें" },
  act_mark_cooking: { en: "Start cooking", hi: "बनाना शुरू" },
  act_mark_ready: { en: "Mark ready", hi: "तैयार चिह्नित" },
  act_mark_served: { en: "Mark served", hi: "परोसा चिह्नित" },
  act_86: { en: "86 this item", hi: "यह आइटम बंद करें" },
  act_restore: { en: "Restock", hi: "फिर से स्टॉक" },
  act_request_bill: { en: "Request bill", hi: "बिल मांगें" },
  act_pay: { en: "Pay & close", hi: "भुगतान करें" },
  act_join_queue: { en: "Join the queue", hi: "कतार में जुड़ें" },
  act_scan_order: { en: "Scan to order", hi: "ऑर्डर के लिए स्कैन" },
  act_split_bill: { en: "Split bill", hi: "बिल बांटें" },
  act_suggest_sub: { en: "Suggest a substitute", hi: "विकल्प सुझाएं" },
  act_ask_ai: { en: "Ask Chalu AI", hi: "चालू AI से पूछें" },
  act_login: { en: "Log in", hi: "लॉगिन" },
  act_signup: { en: "Sign up", hi: "साइन अप" },
  act_verify_otp: { en: "Verify OTP", hi: "OTP जांचें" },
  act_continue_guest: { en: "Continue as guest", hi: "मेहमान के रूप में जारी रखें" },

  // bill
  bill_subtotal: { en: "Subtotal", hi: "उप-योग" },
  bill_cgst: { en: "CGST (2.5%)", hi: "CGST (2.5%)" },
  bill_sgst: { en: "SGST (2.5%)", hi: "SGST (2.5%)" },
  bill_gst: { en: "GST (5%)", hi: "GST (5%)" },
  bill_total: { en: "Total", hi: "कुल" },
  bill_grand_total: { en: "Grand Total", hi: "कुल देय" },
  bill_item: { en: "Item", hi: "आइटम" },
  bill_qty: { en: "Qty", hi: "मात्रा" },
  bill_price: { en: "Price", hi: "मूल्य" },
  bill_amt: { en: "Amount", hi: "राशि" },

  // misc
  label_table: { en: "Table", hi: "टेबल" },
  label_ticket: { en: "Ticket", hi: "टिकट" },
  label_wait: { en: "Est. wait", hi: "अनुमानित प्रतीक्षा" },
  label_empty_menu: {
    en: "Nothing on this station right now — orders will print in here the moment a table submits one.",
    hi: "इस स्टेशन पर अभी कुछ नहीं — जैसे ही कोई टेबल ऑर्डर भेजेगा, यहां टिकट छपेगा।",
  },
  label_empty_cart: {
    en: "Your order slip is empty — pick a dish from the menu to get started.",
    hi: "आपका ऑर्डर स्लिप खाली है — शुरू करने के लिए मेनू से एक व्यंजन चुनें।",
  },
  label_86_banner: {
    en: "Just went 86'd",
    hi: "अभी बंद हुआ",
  },
  label_substitute: {
    en: "Try this instead",
    hi: "इसकी जगह यह आज़माएं",
  },
  label_min: { en: "min", hi: "मिनट" },
  label_role: { en: "Role", hi: "भूमिका" },
  label_inr: { en: "₹", hi: "₹" },

  // toasts
  toast_sent_kitchen: { en: "Sent to kitchen", hi: "रसोई में भेज दिया" },
  toast_marked_cooking: { en: "Now cooking", hi: "अब बन रहा है" },
  toast_marked_ready: { en: "Marked ready", hi: "तैयार चिह्नित" },
  toast_marked_served: { en: "Marked served", hi: "परोसा चिह्नित" },
  toast_86: { en: "Marked out of stock — synced to every screen", hi: "स्टॉक खत्म चिह्नित — हर स्क्रीन पर सिंक हो गया" },
  toast_restocked: { en: "Restocked — back on the menu", hi: "फिर से स्टॉक — मेनू पर वापस" },
  toast_added: { en: "Added to order", hi: "ऑर्डर में जोड़ा" },
  toast_login_ok: { en: "Logged in", hi: "लॉगिन हो गया" },
  toast_login_fail: { en: "Wrong email or password", hi: "गलत ईमेल या पासवर्ड" },

  // hero
  hero_title_1: { en: "The menu doesn't lie anymore.", hi: "अब मेनू झूठ नहीं बोलता।" },
  hero_title_2: {
    en: "What's 86'd in the kitchen disappears from your table — instantly.",
    hi: "रसोई में जो बंद होता है, वह आपकी टेबल से तुरंत गायब हो जाता है।",
  },
  hero_cta_order: { en: "See today's live menu", hi: "आज का लाइव मेनू देखें" },
  hero_cta_kitchen: { en: "I'm kitchen staff", hi: "मैं रसोई स्टाफ हूं" },
  hero_cta_admin: { en: "I run this place", hi: "मैं यहां का मालिक हूं" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
