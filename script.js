/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
let selectedProducts = [];  // must be let for reassignment

// Modal elements
const modal = document.getElementById("productModal");
const modalImage = document.getElementById("modalImage");
const modalName = document.getElementById("modalName");
const modalBrand = document.getElementById("modalBrand");
const modalDescription = document.getElementById("modalDescription");
const closeBtn = document.querySelector(".close-btn");

// Add Clear All button to Selected Products section dynamically
const selectedProductsContainer = document.querySelector(".selected-products");
const clearAllBtn = document.createElement("button");
clearAllBtn.textContent = "Clear All";
clearAllBtn.className = "clear-all-btn";
selectedProductsContainer.appendChild(clearAllBtn);

// Initial placeholder before category selection
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = "";

  const initialCount = 6;
  const visibleProducts = products.slice(0, initialCount);
  const remainingProducts = products.slice(initialCount);

  // Render first 6 products
  visibleProducts.forEach(product => createProductCard(product));

  // Add Show More button if needed
  if (remainingProducts.length > 0) {
    const showMoreBtn = document.createElement("button");
    showMoreBtn.textContent = "Show All Products";
    showMoreBtn.className = "show-more-btn";
    showMoreBtn.addEventListener("click", () => {
      remainingProducts.forEach(product => createProductCard(product));
      showMoreBtn.remove();
    });
    productsContainer.appendChild(showMoreBtn);
  }
}

function createProductCard(product) {
  const card = document.createElement("div");
  card.classList.add("product-card");

  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <div class="product-info">
      <h3>${product.name}</h3>
      <p>${product.brand}</p>
      <button class="info-btn">More Info</button>
      <div class="product-description hidden">${product.description}</div>
    </div>
  `;

  // Toggle selection
  card.addEventListener("click", (e) => {
    if (e.target.classList.contains("info-btn")) return;
    toggleProductSelection(product, card);
  });

  // Modal
  card.querySelector(".info-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    modalImage.src = product.image;
    modalName.textContent = product.name;
    modalBrand.textContent = product.brand;
    modalDescription.textContent = product.description;
    modal.classList.remove("hidden");
  });

  // Highlight if selected
  if (selectedProducts.find(p => p.id === product.id)) {
    card.classList.add("selected");
  }

  productsContainer.appendChild(card);
}

// Toggle selection of a product and update UI/localStorage
function toggleProductSelection(product, card) {
  const index = selectedProducts.findIndex(p => p.id === product.id);
  if (index > -1) {
    selectedProducts.splice(index, 1);
    card.classList.remove("selected");
  } else {
    selectedProducts.push(product);
    card.classList.add("selected");
  }
  updateSelectedProducts();
  saveSelectedToLocalStorage();
}

// Save selectedProducts array to localStorage
function saveSelectedToLocalStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Render the selected products list with remove buttons
function updateSelectedProducts() {
  const list = document.getElementById("selectedProductsList");
  list.innerHTML = "";

  selectedProducts.forEach((product, index) => {
    const item = document.createElement("div");
    item.className = "selected-product-item";
    item.innerHTML = `
      <span>${product.name}</span>
      <button class="remove-btn" aria-label="Remove ${product.name}">&times;</button>
    `;

    item.querySelector(".remove-btn").addEventListener("click", () => {
      selectedProducts.splice(index, 1);
      updateSelectedProducts();
      saveSelectedToLocalStorage();
      highlightSelectedCards();
    });

    list.appendChild(item);
  });
}

// Highlight product cards that are selected
function highlightSelectedCards() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    const name = card.querySelector("h3").textContent;
    const isSelected = selectedProducts.some(p => p.name === name);
    card.classList.toggle("selected", isSelected);
  });
}

// Clear all selected products
clearAllBtn.addEventListener("click", () => {
  selectedProducts = [];
  updateSelectedProducts();
  saveSelectedToLocalStorage();
  highlightSelectedCards();
});

// Filter and display products on category change
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Load saved selections, display products, highlight selections on page load
window.addEventListener("DOMContentLoaded", async () => {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch {
      selectedProducts = [];
    }
  }
  updateSelectedProducts();
  highlightSelectedCards();

  const products = await loadProducts();
  displayProducts(products);
});

// Close modal handlers
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

// Initialize messages array for chat context
let messages = [
  {
    role: "system",
    content: "You are a helpful and friendly L'Oréal beauty advisor. Respond only to beauty, skincare, haircare, and fragrance-related questions."
  }
];

// Handle Generate Routine button click
document.getElementById("generateRoutine").addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "Please select at least one product.";
    return;
  }

  const productNames = selectedProducts.map(p => `${p.name} (${p.category})`).join(", ");
  const userPrompt = `I have selected the following L'Oréal products: ${productNames}. Can you build a skincare or beauty routine using them?`;

  chatWindow.innerHTML = "Generating routine...";

  try {
    const response = await fetch("https://loreal-pt2.wcummings1.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: messages[0].content },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.choices) {
      throw new Error(data.error || "Cloudflare worker error");
    }

    const aiMessage = data.choices[0].message.content.trim();
    chatWindow.innerHTML = aiMessage.replace(/\n/g, "<br>");
    messages.push({ role: "user", content: userPrompt });
    messages.push({ role: "assistant", content: aiMessage });

  } catch (error) {
    console.error("Routine generation error:", error);
    chatWindow.innerHTML = `Error: ${error.message}`;
  }
});

// Chat form submission for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  messages.push({ role: "user", content: userInput });
  appendMessage("user", userInput);
  document.getElementById("userInput").value = "";

  try {
    const response = await fetch("https://loreal-pt2.wcummings1.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();

    if (!response.ok || !data.choices) {
      throw new Error(data.error || "Cloudflare worker error");
    }

    const aiMessage = data.choices[0].message.content.trim();
    messages.push({ role: "assistant", content: aiMessage });
    appendMessage("assistant", aiMessage);

  } catch (error) {
    console.error("Chat error:", error);
    appendMessage("assistant", `Error: ${error.message}`);
  }
});

// Append chat messages to chat window
function appendMessage(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = role === "user" ? "chat-message user" : "chat-message assistant";
  msgDiv.innerHTML = `<p>${content.replace(/\n/g, "<br>")}</p>`;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
