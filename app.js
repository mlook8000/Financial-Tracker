const defaultAccounts = {
  "Savings": 0,
  "Checking": 0,
  "Credit Card (Capital One)": 0,
  "HYSA (Capital One)": 0,
  "Investments (Robinhood)": 0,
  "Roth IRA (Robinhood)": 0,
};

const money = (value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loadAccounts() {
  const stored = JSON.parse(localStorage.getItem("sparkle_accounts") || "null");
  return stored ? { ...defaultAccounts, ...stored } : { ...defaultAccounts };
}

function saveAccounts(accounts) {
  localStorage.setItem("sparkle_accounts", JSON.stringify(accounts));
}

function renderAccounts() {
  const accounts = loadAccounts();
  const container = document.getElementById("totals");
  container.innerHTML = "";

  let assets = 0;
  let debt = 0;

  Object.entries(accounts).forEach(([name, value]) => {
    const amount = Number(value || 0);
    const isDebt = name.startsWith("Credit Card");

    if (isDebt) debt += Math.abs(amount);
    else assets += amount;

    const div = document.createElement("div");
    div.className = "total-item";
    div.innerHTML = `<span><strong>${name}</strong><br><small>${isDebt ? "Liability" : "Asset"}</small></span><strong>${money(amount)}</strong>`;
    container.appendChild(div);
  });

  const netWorth = assets - debt;
  document.getElementById("assets-total").textContent = money(assets);
  document.getElementById("debt-total").textContent = money(debt);
  document.getElementById("net-total").textContent = money(netWorth);
}

document.getElementById("account-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("account-name").value;
  const balance = parseFloat(document.getElementById("account-balance").value || "0");
  const accounts = loadAccounts();
  accounts[name] = balance;
  saveAccounts(accounts);
  renderAccounts();
});

document.getElementById("budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const income = parseFloat(document.getElementById("income").value || "0");
  const needs = parseFloat(document.getElementById("needs").value || "0");
  const wants = parseFloat(document.getElementById("wants").value || "0");
  const savingsInvest = parseFloat(document.getElementById("savings-invest").value || "0");
  const output = document.getElementById("budget-health");

  if (income <= 0) {
    output.textContent = "Please enter a monthly income above $0.";
    return;
  }

  const totalSpent = needs + wants + savingsInvest;
  const pctNeeds = (needs / income) * 100;
  const pctWants = (wants / income) * 100;
  const pctSavings = (savingsInvest / income) * 100;

  let message = `Needs ${pctNeeds.toFixed(0)}% · Wants ${pctWants.toFixed(0)}% · Savings/Investing ${pctSavings.toFixed(0)}%.`;
  if (totalSpent > income) message += " Over budget: cut wants first and prioritize high-interest debt payoff.";
  else message += " On track: keep building emergency fund + long-term investments.";

  output.textContent = message;
});

document.getElementById("ask-ai").addEventListener("click", async () => {
  const apiKey = document.getElementById("api-key").value.trim();
  const prompt = document.getElementById("ai-prompt").value.trim();
  const out = document.getElementById("ai-response");

  if (!apiKey || !prompt) {
    out.textContent = "Please add your API key and a question.";
    return;
  }

  out.textContent = "Thinking...";
  const accounts = loadAccounts();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: "You are a practical personal finance coach. Give educational, concise, step-by-step guidance." },
          { role: "user", content: `My balances are ${JSON.stringify(accounts)}. ${prompt}` },
        ],
      }),
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    out.textContent = data.output_text || "No response text returned.";
  } catch (error) {
    out.textContent = `Could not reach AI API: ${error.message}`;
  }
});

renderAccounts();
