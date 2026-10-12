// Starter content taken from the "L&D Kids Retail Training" deck.
// Everything is editable from L&D -> Program Management.

const q = (question, options, correct, explanation = "") => ({ question, options, correct, explanation });

module.exports = [
  {
    title: "Front End Staff Training",
    audience: "Front End Staff",
    description: "Greeting, billing accuracy and first impression at the counter.",
    modules: [
      { title: "Greeting & First Impression", minutes: 15, description: "Welcome every family warmly within the first few seconds and set the tone for the visit.",
        highlights: "Warm greeting|Eye contact & smile|Counter etiquette|Handling queues",
        questions: [
          q("How soon should a customer be greeted after entering the store?", ["Within a few seconds", "After they ask for help", "After 5 minutes", "Only at billing"], 0),
          q("Which behaviour creates the best first impression?", ["Smile, eye contact and a warm welcome", "Continue phone conversation", "Wait silently at the counter", "Ask them to queue outside"], 0),
          q("A child is crying at the counter. Best response?", ["Stay calm, be friendly and help the parent", "Ignore until they stop", "Ask them to leave", "Call the manager immediately"], 0),
        ] },
      { title: "Billing Accuracy at the Counter", minutes: 15, description: "Scan, apply offers and bill correctly every time.",
        highlights: "Scan accuracy|Applying offers|Payment modes|Bill checks",
        questions: [
          q("Before handing over the bill you should:", ["Check items, offers and total with the customer", "Hand over quickly", "Skip the offer check", "Ask the next customer to verify"], 0),
          q("A combo offer does not apply automatically. You should:", ["Check offer rules and escalate if needed", "Give a random discount", "Refuse the offer", "Cancel the bill"], 0),
        ] },
      { title: "Combo Offers & Returns Basics", minutes: 15, description: "Explain combos clearly and follow the returns process.",
        highlights: "Buy-2-Get-1|Family packs|Return policy|Exchange steps",
        questions: [
          q("What is the main goal of combo and bundle offers?", ["Grow basket size", "Reduce footfall", "Clear the billing queue", "Replace loyalty points"], 0),
          q("Before processing a return you must:", ["Verify the policy and the bill", "Accept any item", "Refuse all returns", "Skip the bill"], 0),
        ] },
    ],
  },
  {
    title: "Sales Executive Training",
    audience: "Sales Executive",
    description: "Product knowledge, customer engagement and upselling promotions.",
    modules: [
      { title: "Product Knowledge & Kids Sizing Guide", minutes: 35, description: "Learn the product range, size guide, key collection details and selling points to confidently assist customers.",
        highlights: "Product range|Size guide|Key features|Selling points",
        questions: [
          q("Which tool helps you recommend the right size for a child?", ["The kids size chart", "Guessing by height of parent", "Colour of the garment", "Price tag"], 0),
          q("Why explain key features and benefits to customers?", ["It builds confidence and supports the sale", "It slows the customer down", "It is only for managers", "It is not required"], 0),
        ] },
      { title: "Customer Engagement & Upselling Techniques", minutes: 40, description: "Engage families, understand needs and suggest the right add-ons.",
        highlights: "Open questions|Cross-selling|Combo suggestions|Closing the sale",
        questions: [
          q("Which is a good upselling approach?", ["Suggest a matching item that fits the need", "Push the most expensive item", "Avoid suggesting anything", "Ask only yes/no questions"], 0),
          q("Open-ended questions help to:", ["Understand customer needs", "End the conversation", "Reduce engagement", "Hide offers"], 0),
        ] },
      { title: "Visual Merchandising Basics for Promo Displays", minutes: 30, description: "Create attractive promo displays that drive footfall and conversion.",
        highlights: "Promo zones|Colour blocking|Signage|Display upkeep",
        questions: [
          q("Promo displays should be:", ["Clean, visible and well-stocked", "Cluttered but colourful", "Hidden near storage", "Changed once a year"], 0),
        ] },
      { title: "Handling Combo Offers, Billing & Returns", minutes: 35, description: "Apply combo offers correctly and handle billing and returns smoothly.",
        highlights: "Combo rules|Billing steps|Returns|Exchanges",
        questions: [
          q("Buy-2-Get-1 means:", ["Customer pays for 2 and gets 1 free as per rules", "Customer pays for 3", "Customer gets 2 free", "Offer applies on bills only"], 0),
        ] },
    ],
  },
  {
    title: "Store Manager Training",
    audience: "Store Manager",
    description: "Campaign planning, team coaching and performance tracking.",
    modules: [
      { title: "Promotion Planning & Campaign Execution", minutes: 30, description: "Plan seasonal, festive and combo campaigns and execute them consistently.",
        highlights: "Campaign calendar|Seasonal themes|Execution checklist|Review",
        questions: [
          q("Target footfall and sales uplift during active campaign weeks is:", ["+20%", "+2%", "-10%", "No target"], 0),
        ] },
      { title: "Team Coaching, Briefing & Motivation", minutes: 30, description: "Brief the team daily and coach for consistent floor execution.",
        highlights: "Daily briefing|On-floor coaching|Feedback|Recognition",
        questions: [
          q("A good daily briefing should:", ["Align the team on goals and offers", "Be skipped on busy days", "Only cover attendance", "Be held monthly"], 0),
        ] },
      { title: "Inventory & Stock Management for Offers", minutes: 30, description: "Ensure stock availability and accuracy for promotion periods.",
        highlights: "Stock planning|Replenishment|Display stock|Shrinkage",
        questions: [
          q("Before a promotion starts you should:", ["Confirm stock availability and display readiness", "Order after launch", "Ignore stock levels", "Remove old stock only"], 0),
        ] },
      { title: "Performance Tracking & Sales Reporting", minutes: 30, description: "Track KPIs and report campaign results.",
        highlights: "Daily sales|Footfall & conversion|Basket size|Reporting",
        questions: [
          q("Which metric shows how many visitors buy?", ["Conversion rate", "Shelf count", "Staff count", "Store size"], 0),
        ] },
    ],
  },
];
