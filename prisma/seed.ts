// Chalu seed — a believable single North-Indian/multi-cuisine dine-in restaurant.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding Chalu…");

  // ---- Restaurant ----
  const restaurant = await db.restaurant.create({
    data: {
      name: "Chalu Dhaba & Kitchen",
      nameHi: "चालू ढाबा एंड किचन",
      tagline: "Live kitchen, honest menu. Since 2019.",
      address: "12 Bandra Linking Road, Mumbai 400050",
      phone: "+91 98200 11223",
      gstRate: 5,
    },
  });

  // ---- Users (demo creds in README) ----
  const pw = await bcrypt.hash("chalu123", 10);
  const users = await Promise.all([
    db.user.create({ data: { email: "owner@chalu.in", passwordHash: pw, name: "Anita Desai", role: "owner", phone: "+91 98200 11223" } }),
    db.user.create({ data: { email: "kitchen@chalu.in", passwordHash: pw, name: "Chef Ramesh", role: "kitchen", phone: "+91 98200 44556" } }),
    db.user.create({ data: { email: "waiter@chalu.in", passwordHash: pw, name: "Suresh Patil", role: "staff", phone: "+91 98200 77889" } }),
    db.user.create({ data: { email: "guest@chalu.in", passwordHash: pw, name: "Priya Sharma", role: "customer", phone: "+91 98200 99001" } }),
  ]);

  // ---- Tables ----
  const tableDefs = [
    { code: "T1", label: "Window Booth", seats: 2, status: "occupied" },
    { code: "T2", label: "Window Booth", seats: 2, status: "empty" },
    { code: "T3", label: "Centre", seats: 4, status: "occupied" },
    { code: "T4", label: "Centre", seats: 4, status: "reserved" },
    { code: "T5", label: "Centre", seats: 4, status: "empty" },
    { code: "T6", label: "Family", seats: 6, status: "occupied" },
    { code: "T7", label: "Family", seats: 6, status: "cleaning" },
    { code: "T8", label: "Patio", seats: 4, status: "empty" },
  ];
  const tables = await Promise.all(
    tableDefs.map((t) =>
      db.tableToken.create({ data: { ...t, qrToken: `QR-${t.code}-${Math.random().toString(36).slice(2, 8)}` } }),
    ),
  );

  // ---- Ingredients ----
  const ingredientDefs = [
    { name: "Paneer", nameHi: "पनीर", stockLevel: 18, lowThreshold: 10, unit: "kg" },
    { name: "Chicken", nameHi: "चिकन", stockLevel: 24, lowThreshold: 10, unit: "kg" },
    { name: "Mutton", nameHi: "मटन", stockLevel: 6, lowThreshold: 8, unit: "kg" },
    { name: "Basmati Rice", nameHi: "बासमती चावल", stockLevel: 40, lowThreshold: 15, unit: "kg" },
    { name: "Toor Dal", nameHi: "तूर दाल", stockLevel: 30, lowThreshold: 10, unit: "kg" },
    { name: "Urad Dal", nameHi: "उड़द दाल", stockLevel: 12, lowThreshold: 8, unit: "kg" },
    { name: "Tomato", nameHi: "टमाटर", stockLevel: 22, lowThreshold: 10, unit: "kg" },
    { name: "Onion", nameHi: "प्याज", stockLevel: 35, lowThreshold: 10, unit: "kg" },
    { name: "Curd", nameHi: "दही", stockLevel: 14, lowThreshold: 6, unit: "kg" },
    { name: "Cream", nameHi: "क्रीम", stockLevel: 8, lowThreshold: 5, unit: "L" },
    { name: "Maida", nameHi: "मैदा", stockLevel: 20, lowThreshold: 8, unit: "kg" },
    { name: "Atta", nameHi: "आटा", stockLevel: 25, lowThreshold: 10, unit: "kg" },
    { name: "Gulab Jamun Mix", nameHi: "गुलाब जामुन मिक्स", stockLevel: 5, lowThreshold: 6, unit: "packs" },
    { name: "Tea Leaves", nameHi: "चाय पत्ती", stockLevel: 4, lowThreshold: 3, unit: "kg" },
    { name: "Mint", nameHi: "पुदीना", stockLevel: 3, lowThreshold: 4, unit: "bunch" },
  ];
  const ingredients = await Promise.all(
    ingredientDefs.map((i) => db.ingredient.create({ data: i })),
  );
  const ingByName = Object.fromEntries(ingredients.map((i) => [i.name, i]));

  // ---- Menu items (28 real dishes) ----
  type DishDef = {
    name: string; nameHi: string; description: string; descriptionHi: string;
    category: string; price: number; veg: "veg" | "nonveg" | "egg"; spice: 0 | 1 | 2 | 3;
    bestseller?: boolean; prepMinutes?: number; available?: boolean; ings: string[];
  };
  const dishes: DishDef[] = [
    // Starters
    { name: "Paneer Tikka", nameHi: "पनीर टिक्का", description: "Char-grilled cottage cheese, mint chutney, lemon.", descriptionHi: "कोयले पर भुना पनीर, पुदीना चटनी, नींबू।", category: "starters", price: 280, veg: "veg", spice: 2, bestseller: true, prepMinutes: 14, ings: ["Paneer", "Mint", "Curd"] },
    { name: "Chicken 65", nameHi: "चिकन 65", description: "Fried chicken, curry leaf, dry red chilli.", descriptionHi: "तला हुआ चिकन, करी पत्ता, सूखी लाल मिर्च।", category: "starters", price: 320, veg: "nonveg", spice: 3, bestseller: true, prepMinutes: 12, ings: ["Chicken", "Mint", "Curd"] },
    { name: "Tandoori Mushroom", nameHi: "तंदूरी मशरूम", description: "Smoky mushrooms, yoghurt marinade.", descriptionHi: "धुएंदार मशरूम, दही मैरीनेड।", category: "starters", price: 260, veg: "veg", spice: 2, prepMinutes: 13, ings: ["Curd", "Mint"] },
    { name: "Fish Amritsari", nameHi: "फिश अमृतसरी", description: "Batter-fried fish, ajwain, chaat masala.", descriptionHi: "बेसन में तली मछली, अजवायन, चाट मसाला।", category: "starters", price: 360, veg: "nonveg", spice: 2, prepMinutes: 15, ings: ["Mint", "Curd"] },
    { name: "Hara Bhara Kebab", nameHi: "हरा भरा कबाब", description: "Spinach, peas, paneer patties.", descriptionHi: "पालक, मटर, पनीर के कबाब।", category: "starters", price: 240, veg: "veg", spice: 1, prepMinutes: 14, ings: ["Paneer", "Mint"] },

    // Mains
    { name: "Butter Chicken", nameHi: "बटर चिकन", description: "Tandoori chicken in tomato-cream gravy.", descriptionHi: "तंदूरी चिकन टमाटर-क्रीम ग्रेवी में।", category: "mains", price: 380, veg: "nonveg", spice: 2, bestseller: true, prepMinutes: 20, ings: ["Chicken", "Tomato", "Cream", "Curd"] },
    { name: "Paneer Butter Masala", nameHi: "पनीर बटर मसाला", description: "Cottage cheese in silky tomato gravy.", descriptionHi: "मख्खनदार टमाटर ग्रेवी में पनीर।", category: "mains", price: 320, veg: "veg", spice: 1, bestseller: true, prepMinutes: 18, ings: ["Paneer", "Tomato", "Cream"] },
    { name: "Dal Makhani", nameHi: "दाल मखनी", description: "Slow-cooked black urad, cream, butter.", descriptionHi: "धीमी आंच पर पकी उड़द दाल, क्रीम, मक्खन।", category: "mains", price: 260, veg: "veg", spice: 1, prepMinutes: 25, ings: ["Urad Dal", "Tomato", "Cream"] },
    { name: "Mutton Rogan Josh", nameHi: "मटन रोगन जोश", description: "Kashmiri red mutton curry, aromatic.", descriptionHi: "कश्मीरी लाल मटन करी, सुगंधित।", category: "mains", price: 460, veg: "nonveg", spice: 3, prepMinutes: 35, ings: ["Mutton", "Tomato", "Onion"] },
    { name: "Chana Masala", nameHi: "चना मसाला", description: "Chickpeas in a tangy onion-tomato masala.", descriptionHi: "खट्टी-मीठी प्याज-टमाटर मसाले में चने।", category: "mains", price: 240, veg: "veg", spice: 2, prepMinutes: 18, ings: ["Tomato", "Onion"] },
    { name: "Kadai Paneer", nameHi: "कड़ाही पनीर", description: "Paneer tossed with bell pepper, kadai masala.", descriptionHi: "शिमला मिर्च और कड़ाही मसाले के साथ पनीर।", category: "mains", price: 330, veg: "veg", spice: 2, prepMinutes: 16, ings: ["Paneer", "Tomato", "Onion"] },
    { name: "Palak Paneer", nameHi: "पालक पनीर", description: "Paneer in a creamy spinach gravy.", descriptionHi: "क्रीमी पालक ग्रेवी में पनीर।", category: "mains", price: 310, veg: "veg", spice: 1, prepMinutes: 17, ings: ["Paneer", "Cream"] },

    // Breads
    { name: "Tandoori Roti", nameHi: "तंदूरी रोटी", description: "Whole-wheat flatbread from the tandoor.", descriptionHi: "तंदूर की गेहूं की रोटी।", category: "breads", price: 40, veg: "veg", spice: 0, prepMinutes: 5, ings: ["Atta"] },
    { name: "Butter Naan", nameHi: "बटर नान", description: "Soft maida naan brushed with butter.", descriptionHi: "मक्खन लगा मैदा का नान।", category: "breads", price: 70, veg: "veg", spice: 0, bestseller: true, prepMinutes: 6, ings: ["Maida"] },
    { name: "Garlic Naan", nameHi: "गार्लिक नान", description: "Naan topped with garlic and coriander.", descriptionHi: "लहसुन और धनिया के साथ नान।", category: "breads", price: 80, veg: "veg", spice: 0, prepMinutes: 6, ings: ["Maida"] },
    { name: "Laccha Paratha", nameHi: "लच्छा पराठा", description: "Flaky multi-layered whole-wheat paratha.", descriptionHi: "परतदार गेहूं का पराठा।", category: "breads", price: 60, veg: "veg", spice: 0, prepMinutes: 7, ings: ["Atta"] },
    { name: "Cheese Kulcha", nameHi: "चीज़ कुल्चा", description: "Stuffed kulcha with molten cheese.", descriptionHi: "पिघली चीज़ से भरा कुल्चा।", category: "breads", price: 110, veg: "veg", spice: 0, prepMinutes: 8, ings: ["Maida"] },

    // Rice & Biryani
    { name: "Hyderabadi Veg Biryani", nameHi: "हैदराबादी वेज बिरयानी", description: "Fragrant basmati, vegetables, saffron.", descriptionHi: "महकता बासमती, सब्जियां, केसर।", category: "rice", price: 290, veg: "veg", spice: 2, prepMinutes: 22, ings: ["Basmati Rice", "Curd"] },
    { name: "Chicken Dum Biryani", nameHi: "चिकन दम बिरयानी", description: "Slow-dum chicken biryani, raita on the side.", descriptionHi: "दम पर बनी चिकन बिरयानी, साथ में रायता।", category: "rice", price: 360, veg: "nonveg", spice: 2, bestseller: true, prepMinutes: 26, ings: ["Basmati Rice", "Chicken", "Curd"] },
    { name: "Mutton Biryani", nameHi: "मटन बिरयानी", description: "Aged basmati, tender mutton, whole spices.", descriptionHi: "पुराना बासमती, नर्म मटन, साबुत मसाले।", category: "rice", price: 420, veg: "nonveg", spice: 3, prepMinutes: 32, ings: ["Basmati Rice", "Mutton", "Curd"] },
    { name: "Jeera Rice", nameHi: "जीरा चावल", description: "Basmati tempered with cumin.", descriptionHi: "जीरे के साथ बासमती चावल।", category: "rice", price: 180, veg: "veg", spice: 1, prepMinutes: 10, ings: ["Basmati Rice"] },

    // Desserts
    { name: "Gulab Jamun", nameHi: "गुलाब जामुन", description: "Warm milk dumplings in rose syrup.", descriptionHi: "गुलाब शरबत में गर्म दूध के लड्डू।", category: "desserts", price: 140, veg: "veg", spice: 0, bestseller: true, prepMinutes: 5, ings: ["Gulab Jamun Mix"] },
    { name: "Rasmalai", nameHi: "रसमलाई", description: "Saffron-cardamom milk, soft chenna.", descriptionHi: "केसर-इलायची दूध, नर्म छेना।", category: "desserts", price: 160, veg: "veg", spice: 0, prepMinutes: 4, ings: ["Curd", "Cream"] },
    { name: "Gajar Halwa", nameHi: "गाजर हलवा", description: "Slow-cooked carrot pudding, nuts.", descriptionHi: "धीमी आंच पर पकी गाजर, ड्रिब्बल नट्स।", category: "desserts", price: 180, veg: "veg", spice: 0, prepMinutes: 6, ings: ["Curd", "Cream"] },

    // Beverages
    { name: "Masala Chai", nameHi: "मसाला चाय", description: "Spiced milk tea, simmered.", descriptionHi: "मसालेदार दूध की चाय।", category: "beverages", price: 50, veg: "veg", spice: 1, bestseller: true, prepMinutes: 5, ings: ["Tea Leaves"] },
    { name: "Sweet Lassi", nameHi: "मीठी लस्सी", description: "Chilled yoghurt drink, cardamom.", descriptionHi: "ठंडी दही की लस्सी, इलायची।", category: "beverages", price: 90, veg: "veg", spice: 0, prepMinutes: 3, ings: ["Curd"] },
    { name: "Masala Chaas", nameHi: "मसाला छाछ", description: "Spiced buttermilk with curry leaf.", descriptionHi: "करी पत्ते के साथ मसालेदार छाछ।", category: "beverages", price: 70, veg: "veg", spice: 1, prepMinutes: 3, ings: ["Curd", "Mint"] },
    { name: "Filter Coffee", nameHi: "फ़िल्टर कॉफ़ी", description: "South-style frothy filter coffee.", descriptionHi: "दक्षिणी फ़िल्टर कॉफ़ी, झागदार।", category: "beverages", price: 80, veg: "veg", spice: 0, prepMinutes: 4, ings: [] },
  ];

  const menuItems = await Promise.all(
    dishes.map((d) =>
      db.menuItem.create({
        data: {
          name: d.name, nameHi: d.nameHi, description: d.description, descriptionHi: d.descriptionHi,
          category: d.category, price: d.price, veg: d.veg, spice: d.spice,
          available: d.available ?? true, bestseller: d.bestseller ?? false, prepMinutes: d.prepMinutes ?? 12,
          ingredients: {
            create: d.ings.map((n) => ({ ingredientId: ingByName[n].id, quantity: 1 })),
          },
        },
      }),
    ),
  );
  const menuByName = Object.fromEntries(menuItems.map((m) => [m.name, m]));

  // ---- Mark Gulab Jamun as 86'd so the substitute-suggestion demo has a live subject ----
  await db.menuItem.update({
    where: { id: menuByName["Gulab Jamun"].id },
    data: { available: false, eightySixAt: new Date() },
  });
  await db.ingredient.update({
    where: { id: ingByName["Gulab Jamun Mix"].id },
    data: { available: false, stockLevel: 0 },
  });
  // Mutton low stock → Mutton Biryani flagged but still available (demonstrates low-stock sync)
  await db.ingredient.update({ where: { id: ingByName["Mutton"].id }, data: { stockLevel: 4 } });

  // ---- Order history (last 6 days, ~10-18 orders/day) for analytics + forecasting ----
  const now = new Date();
  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const day = new Date(now);
    day.setDate(now.getDate() - dayOffset);
    const orderCount = 10 + Math.floor(Math.random() * 9);
    let dayRevenue = 0;
    let dayGuests = 0;
    for (let o = 0; o < orderCount; o++) {
      const placed = new Date(day);
      placed.setHours(12 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      const table = tables[Math.floor(Math.random() * tables.length)];
      const lineCount = 2 + Math.floor(Math.random() * 4);
      const lines = [];
      for (let l = 0; l < lineCount; l++) {
        const dish = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        lines.push({
          menuItemId: dish.id, name: dish.name, nameHi: dish.nameHi,
          price: dish.price, qty, veg: dish.veg, spice: dish.spice,
          status: "SERVED",
        });
      }
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const cgst = Math.round(subtotal * 0.025);
      const sgst = Math.round(subtotal * 0.025);
      const total = subtotal + cgst + sgst;
      const party = 1 + Math.floor(Math.random() * 4);
      dayRevenue += total;
      dayGuests += party;
      await db.order.create({
        data: {
          kotNumber: 1000 + dayOffset * 100 + o,
          status: "CLOSED",
          tableId: table.id,
          customerId: users[3].id,
          customerName: "Walk-in",
          partySize: party,
          subtotal, cgst, sgst, total, paid: true, paymentMode: "upi",
          createdAt: placed,
          cookingAt: new Date(placed.getTime() + 3 * 60000),
          readyAt: new Date(placed.getTime() + 20 * 60000),
          servedAt: new Date(placed.getTime() + 28 * 60000),
          closedAt: new Date(placed.getTime() + 45 * 60000),
          items: { create: lines },
        },
      });
    }
    const dateStr = day.toISOString().slice(0, 10);
    await db.salesDaily.create({
      data: { date: dateStr, revenue: dayRevenue, orders: orderCount, guests: dayGuests },
    });
  }

  // ---- A couple of LIVE orders so the kitchen feed isn't empty on first load ----
  const liveTable1 = tables[0]; // T1 occupied
  const liveTable2 = tables[2]; // T3 occupied
  const live1 = await db.order.create({
    data: {
      kotNumber: 1075,
      status: "COOKING",
      tableId: liveTable1.id,
      customerName: "Table T1",
      partySize: 2,
      subtotal: 700, cgst: 18, sgst: 18, total: 736,
      createdAt: new Date(now.getTime() - 6 * 60000),
      cookingAt: new Date(now.getTime() - 3 * 60000),
      items: {
        create: [
          { menuItemId: menuByName["Paneer Tikka"].id, name: "Paneer Tikka", nameHi: "पनीर टिक्का", price: 280, qty: 1, veg: "veg", spice: 2, status: "COOKING" },
          { menuItemId: menuByName["Butter Naan"].id, name: "Butter Naan", nameHi: "बटर नान", price: 70, qty: 2, veg: "veg", spice: 0, status: "COOKING" },
          { menuItemId: menuByName["Masala Chai"].id, name: "Masala Chai", nameHi: "मसाला चाय", price: 50, qty: 2, veg: "veg", spice: 1, status: "NEW" },
        ],
      },
    },
  });
  const live2 = await db.order.create({
    data: {
      kotNumber: 1076,
      status: "NEW",
      tableId: liveTable2.id,
      customerName: "Table T3",
      partySize: 4,
      subtotal: 1140, cgst: 29, sgst: 29, total: 1198,
      createdAt: new Date(now.getTime() - 1 * 60000),
      items: {
        create: [
          { menuItemId: menuByName["Chicken 65"].id, name: "Chicken 65", nameHi: "चिकन 65", price: 320, qty: 1, veg: "nonveg", spice: 3, status: "NEW" },
          { menuItemId: menuByName["Butter Chicken"].id, name: "Butter Chicken", nameHi: "बटर चिकन", price: 380, qty: 1, veg: "nonveg", spice: 2, status: "NEW" },
          { menuItemId: menuByName["Chicken Dum Biryani"].id, name: "Chicken Dum Biryani", nameHi: "चिकन दम बिरयानी", price: 360, qty: 1, veg: "nonveg", spice: 2, status: "NEW" },
        ],
      },
    },
  });

  // ---- A queue entry ----
  await db.queueEntry.create({
    data: { name: "Khan family", phone: "+91 98200 55512", partySize: 5, status: "WAITING", position: 1, quotedWait: 18, tableId: tables[6].id },
  });
  await db.queueEntry.create({
    data: { name: "Mehta", phone: "+91 98200 33344", partySize: 2, status: "WAITING", position: 2, quotedWait: 26 },
  });

  console.log("Seed complete.");
  console.log("Live orders:", live1.kotNumber, live2.kotNumber);
  console.log("Demo users: owner/kitchen/waiter/guest @chalu.in / chalu123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
