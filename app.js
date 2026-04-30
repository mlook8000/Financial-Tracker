const defaultAccounts = {
  "Savings": 0,
  "Checking": 0,
  "Credit Card (Capital One)": 0,
  "HYSA (Capital One)": 0,
  "Investments (Robinhood)": 0,
  "Roth IRA (Robinhood)": 0,
};

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

  Object.entries(accounts).forEach(([name, value]) => {
    const div = document.createElement("div");
    div.className = "total-item";
    div.innerHTML = `<strong>${name}</strong><br>$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    container.appendChild(div);
  });

  const netWorth = Object.entries(accounts).reduce((sum, [name, amount]) => {
    const val = Number(amount || 0);
    return name.startsWith("Credit Card") ? sum - Math.abs(val) : sum + val;
  }, 0);

  const nw = document.createElement("div");
  nw.className = "total-item";
  nw.innerHTML = `<strong>Estimated Net Worth</strong><br>$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  container.appendChild(nw);
}

document.getElementById("account-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("account-name").value;
  const balance = parseFloat(document.getElementById("account-balance").value || "0");
  const accounts = loadAccounts();
  accounts[name] = balance;
  saveAccounts(accounts);
  renderAccounts();
  event.target.reset();
});

document.getElementById("budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const income = parseFloat(document.getElementById("income").value || "0");
  const needs = parseFloat(document.getElementById("needs").value || "0");
  const wants = parseFloat(document.getElementById("wants").value || "0");
  const savingsInvest = parseFloat(document.getElementById("savings-invest").value || "0");

  const totalSpent = needs + wants + savingsInvest;
  const percentNeeds = (needs / income) * 100;
  const percentWants = (wants / income) * 100;
  const percentSavings = (savingsInvest / income) * 100;

  let message = `50/30/20 check → Needs: ${percentNeeds.toFixed(0)}%, Wants: ${percentWants.toFixed(0)}%, Savings+Invest: ${percentSavings.toFixed(0)}%.`;

  if (totalSpent > income) {
    message += " You're over budget. Trim wants first and revisit debt payments.";
  } else {
    message += " Great job staying inside your monthly income.";
  }

  document.getElementById("budget-health").textContent = message;
});

document.getElementById("ask-ai").addEventListener("click", async () => {
  const apiKey = document.getElementById("api-key").value.trim();
  const prompt = document.getElementById("ai-prompt").value.trim();
  const out = document.getElementById("ai-response");
  if (!apiKey || !prompt) {
    out.textContent = "Please add your API key and a question.";
    return;
  }

  const accounts = loadAccounts();
  out.textContent = "Asking AI coach...";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a practical personal finance coach. Give non-professional educational guidance only, concise and actionable.",
          },
          {
            role: "user",
            content: `My current balances are ${JSON.stringify(accounts)}. ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const text = data.output_text || "No response text returned.";
    out.textContent = text;
  } catch (error) {
    out.textContent = `Could not reach AI API: ${error.message}`;
  }
});

renderAccounts();
