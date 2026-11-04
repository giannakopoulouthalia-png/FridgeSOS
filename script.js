const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-navigation");
const navigationOverlay = document.querySelector(".navigation-overlay");
const navigationClose = document.querySelector(".navigation-close");
const screenContent = document.querySelector("#screen-content");
const phoneScreen = document.querySelector(".phone-screen");
const splashScreen = document.querySelector("#splash-screen");
const siteHeader = document.querySelector(".site-header");
const addFoodDialog = document.querySelector("#add-food-dialog");
const addFoodForm = document.querySelector("#add-food-form");
const foodNameInput = document.querySelector("#food-name");
const expirationDateInput = document.querySelector("#expiration-date");
const foodCategoryInput = document.querySelector("#food-category");
const addFoodTitle = document.querySelector("#add-food-title");
const addFoodSubmit = addFoodForm.querySelector('[type="submit"]');
const deleteConfirmationDialog = document.querySelector("#delete-confirmation-dialog");
const deleteConfirmationMessage = document.querySelector("#delete-confirmation-message");
const cancelDeleteButton = document.querySelector("#cancel-delete");
const confirmDeleteButton = document.querySelector("#confirm-delete");
const categoryIcons = {
  Dairy: "🥛",
  Vegetables: "🥬",
  Fruits: "🍎",
  Meat: "🍗",
  Seafood: "🐟",
  Grains: "🌾",
  Other: "🥫",
};
const ingredients = [
  { id: "spinach", category: "Vegetables", name: "Spinach", expiresInDays: 1, icon: "🥬" },
  { id: "tomatoes", category: "Vegetables", name: "Tomatoes", expiresInDays: 2, icon: "🍅" },
  { id: "milk", category: "Dairy", name: "Milk", expiresInDays: 3, icon: "🥛" },
];
let nextIngredientId = 1;
let editingIngredientId = null;
let deletingIngredientId = null;
let dietaryPreference = null;
let preferredCookingTime = null;
let cookingSkillLevel = null;
let recipeBudget = 5;
let recipeServings = 2;
let recipePresetServings = 2;
let recipeCustomServingsEnabled = false;
let recipeStatusTimeout;
const savedRecipes = new Set();
let foodAllergies = [];
let customFoodAllergies = [];
let draftCustomFoodAllergies = [];
const dialogInvokerElements = new WeakMap();
const dialogInertStates = new WeakMap();
const splashInertStates = Array.from(phoneScreen.children)
  .filter((element) => element !== splashScreen)
  .map((element) => [element, element.inert]);

for (const [element] of splashInertStates) {
  element.inert = true;
}

function openPhoneDialog(dialog, initialFocus) {
  if (dialog.open) {
    return;
  }

  dialogInvokerElements.set(dialog, document.activeElement);
  dialogInertStates.set(
    dialog,
    Array.from(phoneScreen.children)
      .filter((element) => element !== dialog)
      .map((element) => [element, element.inert]),
  );
  for (const [element] of dialogInertStates.get(dialog)) {
    element.inert = true;
  }

  if (window.matchMedia("(min-width: 641px)").matches) {
    dialog.show();
  } else {
    dialog.showModal();
  }
  initialFocus.focus();
}

function restorePhoneDialog(dialog) {
  const inertStates = dialogInertStates.get(dialog);
  if (!inertStates) {
    return;
  }

  for (const [element, wasInert] of inertStates) {
    element.inert = wasInert;
  }
  dialogInertStates.delete(dialog);

  const invoker = dialogInvokerElements.get(dialog);
  dialogInvokerElements.delete(dialog);
  if (invoker instanceof HTMLElement && invoker.isConnected && !invoker.inert) {
    invoker.focus();
  }
}

function closePhoneDialog(dialog) {
  if (!dialog.open) {
    return;
  }

  dialog.close();
  restorePhoneDialog(dialog);
  if (dialog === addFoodDialog) {
    resetAddFoodDialog();
  } else if (dialog === deleteConfirmationDialog) {
    deletingIngredientId = null;
  }
}

function configurePhoneDialog(dialog) {
  dialog.addEventListener("close", () => {
    if (!dialog.open) {
      restorePhoneDialog(dialog);
    }
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePhoneDialog(dialog);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closePhoneDialog(dialog);
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePhoneDialog(dialog);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
}

configurePhoneDialog(addFoodDialog);
configurePhoneDialog(deleteConfirmationDialog);

const recipesDatabase = [
  {
    id: "rec-1",
    name: "Creamy Baked Spinach and Tomato Omelette",
    ingredients: ["Spinach", "Tomatoes", "Milk", "Eggs"],
    displayIngredients: ["2 eggs", "100g spinach", "1 tomato", "50ml milk"],
    extraCost: 2,
    steps: "1. Crack the eggs into a clean bowl, add a little milk, and whisk with a fork until fluffy.\n2. Wash the spinach thoroughly and finely chop the fresh tomatoes.\n3. Warm a nonstick pan over low heat with a little oil.\n4. Sauté the spinach until wilted, then add the tomatoes.\n5. Pour the egg mixture over the vegetables, lower the heat, and cook evenly until the omelette is set."
  },
  {
    id: "rec-2",
    name: "Tomato and Creamy Milk Pasta",
    ingredients: ["Tomatoes", "Milk", "Grains"],
    displayIngredients: ["200g pasta", "2 tomatoes", "100ml milk"],
    extraCost: 4,
    steps: "1. Fill a pot with water, season with salt, and bring it to a boil.\n2. Add the pasta and stir occasionally until al dente.\n3. Meanwhile, blend the tomatoes in a separate pan to make the sauce base.\n4. Gradually stir the milk into the tomato sauce until it becomes rich and creamy.\n5. Drain the pasta and toss it directly into the warm sauce."
  },
  {
    id: "rec-3",
    name: "Toasty Cheese and Tomato Sandwich",
    ingredients: ["Bread", "Cheese", "Tomatoes"],
    displayIngredients: ["2 slices of bread", "50g cheese", "1 tomato"],
    extraCost: 1,
    steps: "1. Lay generous slices of cheese on one slice of bread.\n2. Cut the tomato into thin rounds and layer them evenly over the cheese.\n3. Close the sandwich with the second slice of bread.\n4. Place it in a preheated sandwich press and press gently.\n5. Toast until the cheese has melted and the bread is crisp."
  },
  {
    id: "rec-4",
    name: "Classic Fried Eggs with Fresh Bread",
    ingredients: ["Eggs", "Bread"],
    displayIngredients: ["2 eggs", "2 slices of fresh bread"],
    extraCost: 1,
    steps: "1. Heat a little oil in a pan over medium heat.\n2. Carefully crack in the eggs, keeping the yolks intact.\n3. Season with salt and pepper to taste, then fry until the whites are set and the yolks are still runny.\n4. Serve immediately with plenty of fresh bread for dipping."
  },
  {
    id: "rec-5",
    name: "Fresh Spinach Salad with Cheese Cubes",
    ingredients: ["Spinach", "Cheese"],
    displayIngredients: ["100g fresh spinach", "50g cheese"],
    extraCost: 3,
    steps: "1. Wash and thoroughly dry the spinach leaves, then place them in a large salad bowl.\n2. Cut the cheese into small, even cubes.\n3. Scatter the cheese cubes over the spinach.\n4. Toss gently so the ingredients are evenly distributed."
  },
  {
    id: "rec-6",
    name: "Velvety Homemade Tomato Soup",
    ingredients: ["Tomatoes", "Milk"],
    displayIngredients: ["3 tomatoes", "100ml milk"],
    extraCost: 2,
    steps: "1. Blend the tomatoes until smooth and pour them into a small saucepan.\n2. Set the pan over medium heat and bring the tomato mixture to a gentle simmer.\n3. Lower the heat and add the milk, stirring continuously.\n4. Warm the soup through, making sure it does not stick to the bottom of the pan."
  },
  {
    id: "rec-7",
    name: "Classic Pasta with Fragrant Tomato Sauce",
    ingredients: ["Tomatoes", "Grains"],
    displayIngredients: ["200g pasta", "3 tomatoes"],
    extraCost: 2,
    steps: "1. Cook the pasta in plenty of salted boiling water until tender.\n2. In a separate pan, blend the tomatoes and simmer until excess liquid evaporates.\n3. Combine the drained pasta with the homemade tomato sauce.\n4. Toss well so the pasta absorbs the flavors, then serve."
  },
  {
    id: "rec-8",
    name: "Creamy Scrambled Eggs with Milk",
    ingredients: ["Eggs", "Milk"],
    displayIngredients: ["2 eggs", "30ml milk"],
    extraCost: 0,
    steps: "1. Crack the eggs into a bowl, add a tablespoon of milk, and whisk well.\n2. Warm a pan over low heat with a little butter or oil.\n3. Pour in the eggs and stir continuously with a spatula.\n4. Remove from the heat just before they are completely set so they stay soft and creamy."
  },
  {
    id: "rec-9",
    name: "Golden French Toast",
    ingredients: ["Eggs", "Milk", "Bread"],
    displayIngredients: ["2 eggs", "100ml milk", "2 slices of bread"],
    extraCost: 1,
    steps: "1. In a shallow dish, whisk the eggs with a little milk until combined.\n2. Dip the bread slices in the mixture and let them soak it up lightly on both sides.\n3. Heat a pan and add the soaked slices.\n4. Fry until golden brown on both sides."
  },
  {
    id: "rec-10",
    name: "Fragrant Rice with Sautéed Spinach and Tomato",
    ingredients: ["Grains", "Spinach", "Tomatoes"],
    displayIngredients: ["150g rice", "100g spinach", "1 tomato"],
    extraCost: 3,
    steps: "1. Cook the rice in a pot of lightly salted water until tender, then drain.\n2. In a large pan, sauté the spinach until wilted.\n3. Add the chopped tomatoes to the pan and cook until the flavors come together.\n4. Fold the cooked rice into the vegetables and stir gently."
  }
];
let profileDetails = {
  name: "",
  username: "",
  gender: "",
  selfDescribedGender: "",
};
const homeScreenContent = Array.from(screenContent.children, (element) =>
  element.cloneNode(true),
);

function getExpirationDate(daysFromToday) {
  const expirationDate = new Date();
  expirationDate.setHours(0, 0, 0, 0);
  expirationDate.setDate(expirationDate.getDate() + daysFromToday);
  return expirationDate;
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const expirationDate = new Date(year, month - 1, day);
  expirationDate.setHours(0, 0, 0, 0);
  return expirationDate;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysUntilDate(dateString) {
  const expirationDate = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expirationDate - today) / 86_400_000);
}

function getDaysUntilExpiration(expirationDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expirationDate - today) / 86_400_000);
}

function getSortedIngredients() {
  return ingredients
    .map((ingredient) => ({
      ...ingredient,
      expirationDate: ingredient.expirationDate
        ? parseLocalDate(ingredient.expirationDate)
        : getExpirationDate(ingredient.expiresInDays),
    }))
    .sort((first, second) => first.expirationDate - second.expirationDate);
}

function getExpiringSoonIngredients() {
  return getSortedIngredients().filter((ingredient) => {
    const daysUntilExpiration = getDaysUntilExpiration(ingredient.expirationDate);
    return daysUntilExpiration >= 0 && daysUntilExpiration <= 3;
  });
}

function updateFridgeEmergency() {
  const count = screenContent.querySelector("#urgent-ingredient-count");
  const message = screenContent.querySelector("#fridge-emergency-message");
  const card = screenContent.querySelector(".fridge-emergency");

  if (!count || !message || !card) {
    return;
  }

  const expiringSoonCount = getExpiringSoonIngredients().length;
  count.textContent = `${expiringSoonCount} ingredient${
    expiringSoonCount === 1 ? "" : "s"
  } expiring in the next 3 days`;
  message.textContent =
    expiringSoonCount === 0
      ? "Your fridge is in the clear. Nice job keeping food from going to waste!"
      : "Let's turn your soon-to-expire ingredients into something delicious.";
  card.classList.toggle("is-all-clear", expiringSoonCount === 0);
}

function renderUseFirst() {
  const ingredientList = screenContent.querySelector("#ingredient-list");

  if (!ingredientList) {
    return;
  }

  const expiringSoon = getExpiringSoonIngredients();
  updateFridgeEmergency();

  if (expiringSoon.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "ingredient-empty-state";
    emptyState.textContent = "Nothing expiring soon! Your fridge is looking fresh.";
    ingredientList.replaceChildren(emptyState);
    return;
  }

  ingredientList.replaceChildren(
    ...expiringSoon.map((ingredient) => {
      const item = document.createElement("li");
      const icon = document.createElement("span");
      const details = document.createElement("span");
      const name = document.createElement("span");
      const expiration = document.createElement("span");
      const daysUntilExpiration = getDaysUntilExpiration(ingredient.expirationDate);

      item.className = "ingredient-item";
      icon.className = "ingredient-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ingredient.icon;
      details.className = "ingredient-details";
      name.className = "ingredient-name";
      name.textContent = ingredient.name;
      expiration.className = "ingredient-expiration";
      expiration.textContent =
        daysUntilExpiration === 0
          ? "Expires today"
          : daysUntilExpiration === 1
            ? "Expires tomorrow"
            : `Expires in ${daysUntilExpiration} days`;
      details.append(name, expiration);
      item.append(icon, details);
      return item;
    }),
  );
}

function renderFridgeIngredients(container, count) {
  const sortedIngredients = getSortedIngredients();
  count.textContent = `${ingredients.length} ${
    ingredients.length === 1 ? "ingredient" : "ingredients"
  } available`;

  container.replaceChildren(
    ...sortedIngredients.map((ingredient) => {
      const card = document.createElement("article");
      const icon = document.createElement("span");
      const name = document.createElement("h3");
      const expiration = document.createElement("p");
      const actions = document.createElement("div");
      const editButton = createIngredientAction("edit", ingredient);
      const deleteButton = createIngredientAction("delete", ingredient);
      const daysRemaining = getDaysUntilExpiration(ingredient.expirationDate);

      card.className = "fridge-ingredient-card";
      card.dataset.ingredientId = ingredient.id;
      icon.className = "fridge-ingredient-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ingredient.icon;
      name.className = "fridge-ingredient-name";
      name.textContent = ingredient.name;
      expiration.className = "fridge-ingredient-expiration";
      expiration.textContent =
        daysRemaining === 1 ? "1 day remaining" : `${daysRemaining} days remaining`;
      actions.className = "fridge-ingredient-actions";
      actions.append(editButton, deleteButton);
      card.append(icon, name, expiration, actions);
      return card;
    }),
  );
}

function createIngredientAction(action, ingredient) {
  const button = document.createElement("button");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const isEdit = action === "edit";

  button.className = `ingredient-action ingredient-action-${action}`;
  button.type = "button";
  button.dataset.ingredientAction = action;
  button.dataset.ingredientId = ingredient.id;
  button.setAttribute(
    "aria-label",
    `${isEdit ? "Edit" : "Delete"} ${ingredient.name}`,
  );
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  path.setAttribute(
    "d",
    isEdit
      ? "m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"
      : "M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6",
  );
  icon.append(path);
  button.append(icon);
  return button;
}

function updateFridgeCount() {
  const ingredientCount = screenContent.querySelector("#ingredient-count");

  if (ingredientCount) {
    ingredientCount.textContent = ingredients.length;
  }
}

function refreshIngredientViews() {
  const ingredientGrid = screenContent.querySelector(".fridge-ingredient-grid");
  const ingredientCount = screenContent.querySelector(".fridge-ingredient-count");
  const homeEmergencyCard = homeScreenContent.find((element) =>
    element.matches(".fridge-emergency"),
  );

  if (ingredientGrid && ingredientCount) {
    renderFridgeIngredients(ingredientGrid, ingredientCount);
  }

  if (homeEmergencyCard) {
    updateFridgeEmergency(homeEmergencyCard);
  }

  updateFridgeCount();
  renderUseFirst();
}

function openAddFoodDialog(ingredient = null) {
  editingIngredientId = ingredient?.id ?? null;
  addFoodForm.reset();
  foodNameInput.setCustomValidity("");
  expirationDateInput.setCustomValidity("");
  expirationDateInput.min = getTodayDateString();
  addFoodTitle.textContent = editingIngredientId ? "Edit Food" : "Add Food";
  addFoodSubmit.textContent = editingIngredientId ? "Save Changes" : "Add to My Fridge";

  if (ingredient) {
    const sortedIngredient = getSortedIngredients().find(
      (item) => item.id === ingredient.id,
    );
    foodCategoryInput.value = ingredient.category;
    foodNameInput.value = ingredient.name;
    expirationDateInput.value = formatLocalDate(sortedIngredient.expirationDate);
  }

  openPhoneDialog(addFoodDialog, foodCategoryInput);
}

function resetAddFoodDialog() {
  editingIngredientId = null;
  addFoodForm.reset();
  foodNameInput.setCustomValidity("");
  expirationDateInput.setCustomValidity("");
  addFoodTitle.textContent = "Add Food";
  addFoodSubmit.textContent = "Add to My Fridge";
}

function createProfileIcon(pathData, className = "profile-setting-icon") {
  const iconContainer = document.createElement("span");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  iconContainer.className = className;
  iconContainer.setAttribute("aria-hidden", "true");
  icon.setAttribute("viewBox", "0 0 24 24");
  path.setAttribute("d", pathData);
  icon.append(path);
  iconContainer.append(icon);
  return iconContainer;
}

function createProfileBackButton(destination = "Home") {
  const backButton = document.createElement("button");
  const backIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const backPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

  backButton.className = "screen-back-button";
  backButton.type = "button";
  backButton.dataset.screen = destination;
  backButton.setAttribute(
    "aria-label",
    destination === "Home" ? "Back to Home" : "Back to Profile",
  );
  backIcon.setAttribute("viewBox", "0 0 24 24");
  backIcon.setAttribute("aria-hidden", "true");
  backPath.setAttribute("d", "m15 18-6-6 6-6M9 12h11");
  backIcon.append(backPath);
  backButton.append(backIcon);
  return backButton;
}

function createProfileScreen() {
  const profileScreen = document.createElement("section");
  const heading = document.createElement("h2");
  const profileCard = document.createElement("div");
  const profileDetailsContainer = document.createElement("div");
  const profileName = document.createElement("h3");
  const profileUsername = document.createElement("p");
  const editProfileButton = document.createElement("button");
  const settings = document.createElement("div");
  const profileIcon = createProfileIcon(
    "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "profile-avatar",
  );
  const settingItems = [
    { label: "Dietary Preferences", icon: "M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16ZM5 20c2-5 5-8 10-11", setting: "dietary-preferences", value: dietaryPreference },
    { label: "Preferred Cooking Time", icon: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", setting: "cooking-time", value: preferredCookingTime },
    {
      label: "Food Allergies",
      icon: "M12 3 3 20h18L12 3Zm0 6v5m0 3h.01",
      setting: "food-allergies",
      value: [...foodAllergies, ...customFoodAllergies].join(", ") || "None",
    },
    {
      label: "Cooking Skill Level",
      icon: "M4 21h16M6 17h12l-1-8H7l-1 8Zm3-8V6a3 3 0 0 1 6 0v3m2-3 2-2",
      setting: "cooking-skill",
      value: cookingSkillLevel,
    },
  ];

  profileScreen.className = "profile-screen";
  heading.textContent = "My Profile";
  profileCard.className = "profile-card";
  profileDetailsContainer.className = "profile-card-details";
  profileName.className = "profile-name";
  profileName.textContent = profileDetails.name || "Guest User";
  profileUsername.className = "profile-username";
  profileUsername.textContent = profileDetails.username
    ? `@${profileDetails.username}`
    : "";
  profileUsername.hidden = !profileDetails.username;
  editProfileButton.className = "edit-profile-button";
  editProfileButton.type = "button";
  editProfileButton.dataset.screen = "Edit Profile";
  editProfileButton.textContent = "Edit Profile";
  profileDetailsContainer.append(profileName, profileUsername, editProfileButton);
  profileCard.append(profileIcon, profileDetailsContainer);
  settings.className = "profile-settings";

  for (const setting of settingItems) {
    const isInteractiveSetting = Boolean(setting.setting);
    const row = document.createElement(isInteractiveSetting ? "button" : "div");
    const label = document.createElement("span");
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

    row.className = "profile-setting-row";
    if (isInteractiveSetting) {
      row.type = "button";
      row.dataset.profileSetting = setting.setting;
    }
    label.className = "profile-setting-label";
    label.textContent = setting.label;
    if (isInteractiveSetting && setting.value) {
      const savedPreference = document.createElement("span");
      savedPreference.className = "profile-setting-value";
      savedPreference.textContent = setting.value;
      label.append(savedPreference);
    }
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("aria-hidden", "true");
    arrow.classList.add("profile-setting-arrow");
    arrowPath.setAttribute("d", "m9 18 6-6-6-6");
    arrow.append(arrowPath);
    row.append(createProfileIcon(setting.icon), label, arrow);
    settings.append(row);
  }

  profileScreen.append(createProfileBackButton(), heading, profileCard, settings);
  return profileScreen;
}

function createEditProfileScreen() {
  const editProfileScreen = document.createElement("section");
  const heading = document.createElement("h2");
  const form = document.createElement("form");
  const nameLabel = document.createElement("label");
  const nameInput = document.createElement("input");
  const usernameLabel = document.createElement("label");
  const usernameInput = document.createElement("input");
  const genderLabel = document.createElement("label");
  const genderSelect = document.createElement("select");
  const genderPlaceholder = document.createElement("option");
  const genderChoices = [
    "Female",
    "Male",
    "Non-binary",
    "Prefer not to say",
    "Self-describe",
  ];
  const selfDescriptionField = document.createElement("div");
  const selfDescriptionLabel = document.createElement("label");
  const selfDescriptionInput = document.createElement("input");
  const saveButton = document.createElement("button");

  editProfileScreen.className = "dietary-preferences-screen";
  heading.textContent = "Edit Profile";
  form.className = "edit-profile-form";
  form.dataset.form = "edit-profile";

  nameLabel.htmlFor = "profile-name";
  nameLabel.textContent = "Name";
  nameInput.id = "profile-name";
  nameInput.name = "name";
  nameInput.type = "text";
  nameInput.autocomplete = "name";
  nameInput.required = true;
  nameInput.value = profileDetails.name;

  usernameLabel.htmlFor = "profile-username";
  usernameLabel.textContent = "Username";
  usernameInput.id = "profile-username";
  usernameInput.name = "username";
  usernameInput.type = "text";
  usernameInput.autocomplete = "username";
  usernameInput.required = true;
  usernameInput.value = profileDetails.username;

  genderLabel.htmlFor = "profile-gender";
  genderLabel.textContent = "Gender (optional)";
  genderSelect.id = "profile-gender";
  genderSelect.name = "gender";
  genderPlaceholder.value = "";
  genderPlaceholder.textContent = "Select an option";
  genderSelect.append(genderPlaceholder);
  for (const gender of genderChoices) {
    const option = document.createElement("option");
    option.value = gender;
    option.textContent = gender;
    genderSelect.append(option);
  }
  genderSelect.value = profileDetails.gender;

  selfDescriptionField.className = "edit-profile-self-description";
  selfDescriptionField.hidden = profileDetails.gender !== "Self-describe";
  selfDescriptionLabel.htmlFor = "profile-self-described-gender";
  selfDescriptionLabel.textContent = "Describe your gender (optional)";
  selfDescriptionInput.id = "profile-self-described-gender";
  selfDescriptionInput.name = "selfDescribedGender";
  selfDescriptionInput.type = "text";
  selfDescriptionInput.autocomplete = "off";
  selfDescriptionInput.value = profileDetails.selfDescribedGender;
  selfDescriptionField.append(selfDescriptionLabel, selfDescriptionInput);

  saveButton.className = "dietary-preferences-save";
  saveButton.type = "submit";
  saveButton.textContent = "Save Profile";
  form.append(
    nameLabel,
    nameInput,
    usernameLabel,
    usernameInput,
    genderLabel,
    genderSelect,
    selfDescriptionField,
    saveButton,
  );
  editProfileScreen.append(
    createProfileBackButton("Profile"),
    heading,
    form,
  );
  return editProfileScreen;
}

function createDietaryPreferencesScreen() {
  return createPreferenceScreen({
    title: "Dietary Preferences",
    question: "What type of diet do you follow?",
    formName: "dietary-preferences",
    inputName: "dietaryPreference",
    saveLabel: "Save Preferences",
    selectedValue: dietaryPreference ?? "No preference",
    options: ["No preference", "Vegetarian", "Vegan", "Pescatarian", "Other"],
  });
}

function createCookingTimeScreen() {
  return createPreferenceScreen({
    title: "Preferred Cooking Time",
    question: "How much time do you usually have to cook?",
    formName: "cooking-time",
    inputName: "cookingTime",
    saveLabel: "Save Preference",
    selectedValue: preferredCookingTime,
    options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "No time limit"],
  });
}

function createCookingSkillScreen() {
  return createPreferenceScreen({
    title: "Cooking Skill Level",
    question: "How experienced are you in the kitchen?",
    formName: "cooking-skill",
    inputName: "cookingSkill",
    saveLabel: "Save Preference",
    selectedValue: cookingSkillLevel,
    options: ["Beginner", "Intermediate", "Advanced"],
    descriptions: [
      "I'm just getting started!",
      "I can handle everyday recipes.",
      "I love trying challenging recipes.",
    ],
  });
}

function createFoodAllergiesScreen() {
  draftCustomFoodAllergies = [...customFoodAllergies];
  const preferenceScreen = createPreferenceScreen({
    title: "Food Allergies",
    question: "Select any ingredients you're allergic to.",
    formName: "food-allergies",
    inputName: "foodAllergies",
    inputType: "checkbox",
    saveLabel: "Save Allergies",
    selectedValues: foodAllergies,
    options: [
      "Milk",
      "Eggs",
      "Peanuts",
      "Tree Nuts",
      "Fish",
      "Shellfish",
      "Wheat",
      "Soy",
      "Sesame",
    ],
  });
  const form = preferenceScreen.querySelector(".dietary-preferences-form");
  const customSection = document.createElement("section");
  const customHeading = document.createElement("h3");
  const customEntry = document.createElement("div");
  const customInput = document.createElement("input");
  const addButton = document.createElement("button");
  const customError = document.createElement("p");
  const customTags = document.createElement("ul");

  customSection.className = "custom-allergies";
  customHeading.textContent = "Other Allergies";
  customEntry.className = "custom-allergy-entry";
  customInput.className = "custom-allergy-input";
  customInput.type = "text";
  customInput.placeholder = "e.g. Strawberries";
  customInput.setAttribute("aria-label", "Other allergy");
  customInput.autocomplete = "off";
  addButton.className = "custom-allergy-add";
  addButton.type = "button";
  addButton.textContent = "+ Add Allergy";
  customError.className = "custom-allergy-error";
  customError.setAttribute("aria-live", "polite");
  customTags.className = "custom-allergy-tags";
  customTags.setAttribute("aria-label", "Custom allergies");
  customEntry.append(customInput, addButton);
  customSection.append(customHeading, customEntry, customError, customTags);
  form.insertBefore(customSection, form.querySelector(".dietary-preferences-save"));
  renderCustomAllergyTags(customTags, draftCustomFoodAllergies);
  return preferenceScreen;
}

function renderCustomAllergyTags(container, allergies) {
  container.replaceChildren(
    ...allergies.map((allergy, index) => {
      const tag = document.createElement("li");
      const name = document.createElement("span");
      const removeButton = document.createElement("button");

      tag.className = "custom-allergy-tag";
      name.textContent = allergy;
      removeButton.className = "custom-allergy-remove";
      removeButton.type = "button";
      removeButton.dataset.removeAllergy = String(index);
      removeButton.setAttribute("aria-label", `Remove ${allergy}`);
      removeButton.textContent = "×";
      tag.append(name, removeButton);
      return tag;
    }),
  );
}

function createRecipesScreen() {
  const recipesScreen = document.createElement("section");
  const heading = document.createElement("h2");
  const subtitle = document.createElement("p");
  const form = document.createElement("form");
  const budgetField = document.createElement("div");
  const budgetLabel = document.createElement("label");
  const budgetValue = document.createElement("output");
  const budgetInput = document.createElement("input");
  const budgetHint = document.createElement("p");
  const servingsField = document.createElement("div");
  const servingsLabel = document.createElement("label");
  const servingsSelect = document.createElement("select");
  const customServingsToggleLabel = document.createElement("label");
  const customServingsToggle = document.createElement("input");
  const customServingsLabel = document.createElement("label");
  const customServingsPanel = document.createElement("div");
  const customServingsInput = document.createElement("input");
  const customServingsError = document.createElement("p");
  const servingsOptions = [1, 2, 3, 4].map((servings) => {
    const option = document.createElement("option");
    option.value = String(servings);
    option.textContent = String(servings);
    return option;
  });
  const profileCard = document.createElement("aside");
  const profileHeading = document.createElement("h3");
  const profileMessage = document.createElement("p");
  const profileList = document.createElement("ul");
  const profilePreferences = [
    ["Dietary preferences", dietaryPreference || "Not set"],
    [
      "Food allergies",
      [...foodAllergies, ...customFoodAllergies].join(", ") || "None",
    ],
    ["Preferred cooking time", preferredCookingTime || "Not set"],
    ["Cooking skill level", cookingSkillLevel || "Not set"],
  ];
  const submitButton = document.createElement("button");
  const status = document.createElement("p");

  recipesScreen.className = "recipes-screen";
  heading.textContent = "Let's rescue your food!";
  subtitle.className = "recipes-subtitle";
  subtitle.textContent = "Tell us a little about today's meal.";

  form.className = "recipes-form";
  form.dataset.form = "recipe-personalization";

  budgetField.className = "recipe-form-field";
  budgetLabel.htmlFor = "recipe-budget";
  budgetLabel.textContent = "Extra Ingredients Budget";
  budgetValue.id = "recipe-budget-value";
  budgetValue.htmlFor = "recipe-budget";
  budgetValue.className = "recipe-budget-value";
  budgetValue.setAttribute("aria-live", "polite");
  budgetValue.textContent = `€${recipeBudget}`;
  budgetInput.id = "recipe-budget";
  budgetInput.name = "budget";
  budgetInput.type = "range";
  budgetInput.min = "0";
  budgetInput.max = "20";
  budgetInput.step = "1";
  budgetInput.value = String(recipeBudget);
  budgetInput.setAttribute("aria-describedby", "recipe-budget-hint");
  const updateBudget = () => {
    recipeBudget = Number(budgetInput.value);
    budgetValue.textContent = `€${budgetInput.value}`;
  };
  budgetInput.addEventListener("input", updateBudget);
  budgetInput.addEventListener("change", updateBudget);
  budgetHint.id = "recipe-budget-hint";
  budgetHint.className = "recipe-form-hint";
  budgetHint.textContent = "€0 means no additional shopping.";
  budgetField.append(budgetLabel, budgetValue, budgetInput, budgetHint);

  servingsField.className = "recipe-form-field";
  servingsLabel.htmlFor = "recipe-servings";
  servingsLabel.textContent = "Number of Servings";
  servingsSelect.id = "recipe-servings";
  servingsSelect.name = "servings";
  servingsSelect.setAttribute("aria-label", "Number of servings");
  servingsSelect.append(...servingsOptions);
  servingsSelect.value = String(recipePresetServings);
  customServingsToggleLabel.className = "recipe-custom-toggle";
  customServingsToggle.id = "recipe-custom-servings-toggle";
  customServingsToggle.name = "customServingsEnabled";
  customServingsToggle.type = "checkbox";
  customServingsToggle.checked = recipeCustomServingsEnabled;
  customServingsToggleLabel.htmlFor = customServingsToggle.id;
  customServingsToggleLabel.append(
    customServingsToggle,
    document.createTextNode("Custom number of servings"),
  );
  customServingsPanel.className = "recipe-custom-servings-panel";
  customServingsPanel.classList.toggle("is-open", recipeCustomServingsEnabled);
  customServingsPanel.setAttribute(
    "aria-hidden",
    String(!recipeCustomServingsEnabled),
  );
  customServingsPanel.inert = !recipeCustomServingsEnabled;
  customServingsLabel.htmlFor = "recipe-custom-servings";
  customServingsLabel.textContent = "Custom servings";
  customServingsInput.id = "recipe-custom-servings";
  customServingsInput.name = "customServings";
  customServingsInput.type = "number";
  customServingsInput.min = "1";
  customServingsInput.step = "1";
  customServingsInput.required = recipeCustomServingsEnabled;
  customServingsInput.disabled = !recipeCustomServingsEnabled;
  customServingsInput.inputMode = "numeric";
  customServingsInput.value = String(recipeServings);
  customServingsInput.setAttribute("aria-describedby", "recipe-custom-servings-error");
  customServingsError.id = "recipe-custom-servings-error";
  customServingsError.className = "recipe-servings-error";
  customServingsError.setAttribute("aria-live", "polite");
  customServingsPanel.append(
    customServingsLabel,
    customServingsInput,
    customServingsError,
  );
  servingsSelect.addEventListener("change", () => {
    const selectedServings = Number(servingsSelect.value);
    if (Number.isInteger(selectedServings) && selectedServings >= 1) {
      recipePresetServings = selectedServings;
      recipeServings = selectedServings;
      recipeCustomServingsEnabled = false;
      customServingsToggle.checked = false;
      customServingsInput.value = String(selectedServings);
      customServingsInput.required = false;
      customServingsInput.disabled = true;
      customServingsPanel.classList.remove("is-open");
      customServingsPanel.setAttribute("aria-hidden", "true");
      customServingsPanel.inert = true;
      customServingsError.textContent = "";
    }
  });
  customServingsToggle.addEventListener("change", () => {
    recipeCustomServingsEnabled = customServingsToggle.checked;
    customServingsInput.disabled = !recipeCustomServingsEnabled;
    customServingsInput.required = recipeCustomServingsEnabled;
    customServingsPanel.classList.toggle(
      "is-open",
      recipeCustomServingsEnabled,
    );
    customServingsPanel.setAttribute(
      "aria-hidden",
      String(!recipeCustomServingsEnabled),
    );
    customServingsPanel.inert = !recipeCustomServingsEnabled;
    customServingsError.textContent = "";
    customServingsInput.setCustomValidity("");

    if (recipeCustomServingsEnabled) {
      customServingsInput.focus();
    } else {
      recipeServings = recipePresetServings;
    }
  });
  customServingsInput.addEventListener("input", () => {
    customServingsInput.setCustomValidity("");
    customServingsError.textContent = "";
    const selectedServings = customServingsInput.valueAsNumber;
    if (
      Number.isInteger(selectedServings) &&
      selectedServings >= 1
    ) {
      recipeServings = selectedServings;
    }
  });
  customServingsInput.addEventListener("invalid", () => {
    customServingsError.textContent =
      "Enter a whole number of servings, starting at 1.";
    customServingsInput.setCustomValidity(
      "Enter a whole number of servings, starting at 1.",
    );
  });
  servingsField.append(
    servingsLabel,
    servingsSelect,
    customServingsToggleLabel,
    customServingsPanel,
  );

  profileCard.className = "recipe-profile-card";
  profileHeading.textContent = "Your Profile, your way";
  profileMessage.textContent =
    "Dietary preferences, food allergies, preferred cooking time, and cooking skill level will be taken from your existing Profile settings.";
  profileList.className = "recipe-profile-list";

  for (const [label, value] of profilePreferences) {
    const item = document.createElement("li");
    const preferenceName = document.createElement("span");
    const preferenceValue = document.createElement("span");

    preferenceName.textContent = label;
    preferenceValue.textContent = value;
    item.append(preferenceName, preferenceValue);
    profileList.append(item);
  }

  profileCard.append(profileHeading, profileMessage, profileList);

  submitButton.className = "recipes-submit";
  submitButton.type = "submit";
  submitButton.textContent = "Find My Recipes";
  status.className = "recipes-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  form.append(budgetField, servingsField, profileCard, submitButton, status);
  recipesScreen.append(
    createProfileBackButton(),
    heading,
    subtitle,
    form,
  );
  return recipesScreen;
}

function updateRecipeSaveButton(button, recipe) {
  const isSaved = savedRecipes.has(recipe.id);
  button.classList.toggle("is-saved", isSaved);
  button.setAttribute("aria-pressed", String(isSaved));
  button.setAttribute(
    "aria-label",
    isSaved
      ? `Remove ${recipe.name} from saved recipes`
      : `Save ${recipe.name}`,
  );
  button.textContent = isSaved ? "♥ Saved" : "♡ Save";
}

function createRecipeSaveButton(recipe, onChange = () => {}) {
  const button = document.createElement("button");
  button.className = "recipe-save-button";
  button.type = "button";
  updateRecipeSaveButton(button, recipe);
  button.addEventListener("click", () => {
    if (savedRecipes.has(recipe.id)) {
      savedRecipes.delete(recipe.id);
    } else {
      savedRecipes.add(recipe.id);
    }

    updateRecipeSaveButton(button, recipe);
    onChange(savedRecipes.has(recipe.id));
  });
  return button;
}

function createRecipeCard(recipe, openRecipe, onSaveChange = () => {}) {
  const card = document.createElement("article");
  const cardHeader = document.createElement("div");
  const saveButton = createRecipeSaveButton(recipe, onSaveChange);
  const openButton = document.createElement("button");
  const title = document.createElement("h3");
  const costBadge = document.createElement("span");
  const ingredients = document.createElement("p");

  card.className = "recipe-card";
  cardHeader.className = "recipe-card-header";
  openButton.className = "recipe-card-open";
  openButton.type = "button";
  openButton.setAttribute("aria-label", `View ${recipe.name}`);
  title.className = "recipe-card-title";
  title.textContent = recipe.name;
  costBadge.className = "recipe-cost-badge";
  costBadge.textContent = recipe.extraCost === 0
    ? "No extra cost"
    : `Additional cost: €${recipe.extraCost}`;
  ingredients.className = "recipe-card-ingredients";
  ingredients.textContent = `Ingredients: ${recipe.displayIngredients.join(", ")}`;

  cardHeader.append(title, saveButton);
  openButton.append(costBadge, ingredients);
  openButton.addEventListener("click", () => openRecipe(recipe));
  card.append(cardHeader, openButton);
  return card;
}

function createRecipeDetailsScreen(recipe, onBack) {
  const detailScreen = document.createElement("section");
  const detailBack = createProfileBackButton();
  const detailHeading = document.createElement("h2");
  const detailCost = document.createElement("p");
  const saveButton = createRecipeSaveButton(recipe);
  const ingredientsHeading = document.createElement("h3");
  const ingredientsList = document.createElement("ul");
  const stepsHeading = document.createElement("h3");
  const stepsList = document.createElement("ol");
  const bonAppetit = document.createElement("p");

  detailScreen.className = "recipe-detail-screen";
  detailBack.removeAttribute("data-screen");
  detailBack.setAttribute("aria-label", "Back to recipes");
  detailBack.addEventListener("click", onBack);
  detailHeading.className = "recipe-detail-title";
  detailHeading.textContent = recipe.name;
  detailCost.className = "recipe-detail-cost";
  detailCost.textContent = recipe.extraCost === 0
    ? "No extra cost"
    : `Additional cost: €${recipe.extraCost}`;
  ingredientsHeading.className = "recipe-detail-section-title";
  ingredientsHeading.textContent = "Ingredients";
  ingredientsList.className = "recipe-detail-ingredients";
  recipe.displayIngredients.forEach((ingredient) => {
    const item = document.createElement("li");
    item.textContent = ingredient;
    ingredientsList.append(item);
  });
  stepsHeading.className = "recipe-detail-section-title";
  stepsHeading.textContent = "Cooking Instructions";
  stepsList.className = "recipe-detail-steps";
  recipe.steps.split("\n").forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step.replace(/^\d+\.\s*/, "");
    stepsList.append(item);
  });
  bonAppetit.className = "recipe-detail-footer";
  bonAppetit.textContent = "Enjoy!";

  detailScreen.append(
    detailBack,
    detailHeading,
    detailCost,
    saveButton,
    ingredientsHeading,
    ingredientsList,
    stepsHeading,
    stepsList,
    bonAppetit,
  );
  return detailScreen;
}

function createSavedRecipesScreen() {
  const savedScreen = document.createElement("section");
  const heading = document.createElement("h2");
  const savedRecipesList = recipesDatabase.filter((recipe) =>
    savedRecipes.has(recipe.id),
  );

  savedScreen.className = "recipes-screen saved-recipes-screen";
  heading.textContent = "Saved Recipes";
  savedScreen.append(createProfileBackButton(), heading);

  if (savedRecipesList.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "saved-recipes-empty";
    emptyState.textContent =
      "No saved recipes yet. Tap the heart on a recipe to keep it here.";
    savedScreen.append(emptyState);
    return savedScreen;
  }

  const grid = document.createElement("div");
  grid.className = "recipe-card-grid";
  savedRecipesList.forEach((recipe) => {
    grid.append(
      createRecipeCard(
        recipe,
        () => {
          screenContent.replaceChildren(
            createRecipeDetailsScreen(recipe, () => {
              screenContent.replaceChildren(createSavedRecipesScreen());
            }),
          );
        },
        () => screenContent.replaceChildren(createSavedRecipesScreen()),
      ),
    );
  });
  savedScreen.append(grid);
  return savedScreen;
}

function createPreferenceScreen({
  title,
  question: questionText,
  formName,
  inputName,
  inputType = "radio",
  saveLabel,
  selectedValue,
  selectedValues = [],
  options: preferenceOptions,
  descriptions = [],
}) {
  const preferenceScreen = document.createElement("section");
  const heading = document.createElement("h2");
  const question = document.createElement("p");
  const form = document.createElement("form");
  const options = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const saveButton = document.createElement("button");

  preferenceScreen.className = "dietary-preferences-screen";
  heading.textContent = title;
  question.textContent = questionText;
  question.className = "dietary-preferences-question";
  form.className = "dietary-preferences-form";
  form.dataset.form = formName;
  options.className = "dietary-preferences-options";
  legend.textContent = inputType === "checkbox" ? "Choose any that apply" : "Choose one option";
  options.append(legend);

  for (const [index, preference] of preferenceOptions.entries()) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const text = document.createElement("span");
    const copy = document.createElement("span");

    label.className = "dietary-preference-option";
    input.type = inputType;
    input.name = inputName;
    input.value = preference;
    input.required = inputType === "radio" && index === 0;
    input.checked =
      inputType === "checkbox"
        ? selectedValues.includes(preference)
        : selectedValue === preference;
    text.textContent = preference;
    copy.className = "dietary-preference-copy";
    copy.append(text);
    if (descriptions[index]) {
      const description = document.createElement("span");
      description.className = "dietary-preference-description";
      description.textContent = descriptions[index];
      copy.append(description);
    }
    label.append(input, copy);
    options.append(label);
  }

  saveButton.className = "dietary-preferences-save";
  saveButton.type = "submit";
  saveButton.textContent = saveLabel;
  form.append(options, saveButton);
  preferenceScreen.append(
    createProfileBackButton("Profile"),
    heading,
    question,
    form,
  );
  return preferenceScreen;
}

function showScreen(screenName) {
  if (screenName === "Home") {
    screenContent.classList.remove(
      "is-fridge-screen",
      "is-profile-screen",
      "is-dietary-screen",
    );
    screenContent.replaceChildren(
      ...homeScreenContent.map((element) => element.cloneNode(true)),
    );
    updateFridgeCount();
    renderUseFirst();
    return;
  }

  if (screenName === "My Fridge") {
    screenContent.classList.remove("is-profile-screen", "is-dietary-screen");
    screenContent.classList.add("is-fridge-screen");
    const fridgeScreen = document.createElement("section");
    const backButton = document.createElement("button");
    const backIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const backPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const heading = document.createElement("h2");
    const count = document.createElement("p");
    const addFoodButton = document.createElement("button");
    const ingredientGrid = document.createElement("div");

    fridgeScreen.className = "fridge-screen";
    backButton.className = "screen-back-button";
    backButton.type = "button";
    backButton.dataset.screen = "Home";
    backButton.setAttribute("aria-label", "Back to Home");
    backIcon.setAttribute("viewBox", "0 0 24 24");
    backIcon.setAttribute("aria-hidden", "true");
    backPath.setAttribute("d", "m15 18-6-6 6-6M9 12h11");
    backIcon.append(backPath);
    backButton.append(backIcon);
    heading.textContent = screenName;
    count.className = "fridge-ingredient-count";
    addFoodButton.className = "add-food-button";
    addFoodButton.type = "button";
    addFoodButton.textContent = "+ Add Food";
    ingredientGrid.className = "fridge-ingredient-grid";
    renderFridgeIngredients(ingredientGrid, count);
    fridgeScreen.append(backButton, heading, count, addFoodButton, ingredientGrid);
    screenContent.replaceChildren(fridgeScreen);
    return;
  }

  if (screenName === "Profile") {
    screenContent.classList.remove("is-fridge-screen", "is-dietary-screen");
    screenContent.classList.add("is-profile-screen");
    screenContent.replaceChildren(createProfileScreen());
    return;
  }

  if (screenName === "Edit Profile") {
    screenContent.classList.remove("is-fridge-screen");
    screenContent.classList.add("is-profile-screen", "is-dietary-screen");
    screenContent.replaceChildren(createEditProfileScreen());
    return;
  }

  if (screenName === "Dietary Preferences") {
    screenContent.classList.remove("is-fridge-screen");
    screenContent.classList.add("is-profile-screen", "is-dietary-screen");
    screenContent.replaceChildren(createDietaryPreferencesScreen());
    return;
  }

  if (screenName === "Preferred Cooking Time") {
    screenContent.classList.remove("is-fridge-screen");
    screenContent.classList.add("is-profile-screen", "is-dietary-screen");
    screenContent.replaceChildren(createCookingTimeScreen());
    return;
  }

  if (screenName === "Food Allergies") {
    screenContent.classList.remove("is-fridge-screen");
    screenContent.classList.add("is-profile-screen", "is-dietary-screen");
    screenContent.replaceChildren(createFoodAllergiesScreen());
    return;
  }

  if (screenName === "Cooking Skill Level") {
    screenContent.classList.remove("is-fridge-screen");
    screenContent.classList.add("is-profile-screen", "is-dietary-screen");
    screenContent.replaceChildren(createCookingSkillScreen());
    return;
  }

  if (screenName === "Find Recipes") {
    screenContent.classList.remove(
      "is-fridge-screen",
      "is-profile-screen",
      "is-dietary-screen",
    );
    screenContent.replaceChildren(createRecipesScreen());
    return;
  }

  if (screenName === "Saved Recipes") {
    screenContent.classList.remove(
      "is-fridge-screen",
      "is-profile-screen",
      "is-dietary-screen",
    );
    screenContent.replaceChildren(createSavedRecipesScreen());
    return;
  }

  screenContent.classList.remove(
    "is-fridge-screen",
    "is-profile-screen",
    "is-dietary-screen",
  );
  const heading = document.createElement("h2");
  const placeholder = document.createElement("p");
  heading.textContent = screenName;
  placeholder.textContent = "Coming Soon";
  screenContent.replaceChildren(heading, placeholder);
}

function setMenuOpen(isOpen) {
  navigation.classList.toggle("is-open", isOpen);
  navigationOverlay.classList.toggle("is-open", isOpen);
  navigation.setAttribute("aria-hidden", String(!isOpen));
  navigation.inert = !isOpen;
  navigationOverlay.setAttribute("aria-hidden", String(!isOpen));
  navigationOverlay.inert = !isOpen;
  siteHeader.inert = isOpen;
  screenContent.inert = isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu",
  );

  if (isOpen) {
    navigationClose.focus();
  } else {
    menuToggle.focus();
  }
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(!navigation.classList.contains("is-open"));
});

navigationClose.addEventListener("click", () => setMenuOpen(false));
navigationOverlay.addEventListener("click", () => setMenuOpen(false));

navigation.addEventListener("click", (event) => {
  const selectedItem = event.target.closest("[data-screen]");

  if (!selectedItem) {
    return;
  }

  showScreen(selectedItem.dataset.screen);
  setMenuOpen(false);
});

screenContent.addEventListener("click", (event) => {
  const removeAllergyButton = event.target.closest("[data-remove-allergy]");

  if (removeAllergyButton) {
    const allergyIndex = Number(removeAllergyButton.dataset.removeAllergy);
    draftCustomFoodAllergies.splice(allergyIndex, 1);
    renderCustomAllergyTags(
      screenContent.querySelector(".custom-allergy-tags"),
      draftCustomFoodAllergies,
    );
    screenContent.querySelector(".custom-allergy-error").textContent = "";
    return;
  }

  if (event.target.closest(".custom-allergy-add")) {
    const input = screenContent.querySelector(".custom-allergy-input");
    const error = screenContent.querySelector(".custom-allergy-error");
    const allergyName = input.value.trim();

    if (!allergyName) {
      error.textContent = "Enter an allergy name first.";
      input.focus();
      return;
    }

    const normalizedName = allergyName.toLocaleLowerCase();
    const isPredefinedDuplicate = [
      "Milk",
      "Eggs",
      "Peanuts",
      "Tree Nuts",
      "Fish",
      "Shellfish",
      "Wheat",
      "Soy",
      "Sesame",
    ].some((allergy) => allergy.toLocaleLowerCase() === normalizedName);
    const isCustomDuplicate = draftCustomFoodAllergies.some(
      (allergy) => allergy.toLocaleLowerCase() === normalizedName,
    );

    if (isPredefinedDuplicate || isCustomDuplicate) {
      error.textContent = "That allergy has already been added.";
      input.focus();
      return;
    }

    draftCustomFoodAllergies.push(allergyName);
    input.value = "";
    error.textContent = "";
    renderCustomAllergyTags(
      screenContent.querySelector(".custom-allergy-tags"),
      draftCustomFoodAllergies,
    );
    input.focus();
    return;
  }

  const profileSetting = event.target.closest("[data-profile-setting]");

  if (profileSetting?.dataset.profileSetting) {
    const settingScreens = {
      "dietary-preferences": "Dietary Preferences",
      "cooking-time": "Preferred Cooking Time",
      "food-allergies": "Food Allergies",
      "cooking-skill": "Cooking Skill Level",
    };
    showScreen(settingScreens[profileSetting.dataset.profileSetting]);
    return;
  }

  const selectedItem = event.target.closest("[data-screen]");

  if (selectedItem) {
    showScreen(selectedItem.dataset.screen);
    return;
  }

  if (event.target.closest(".add-food-button")) {
    openAddFoodDialog();
    return;
  }

  const ingredientAction = event.target.closest("[data-ingredient-action]");

  if (ingredientAction) {
    const ingredient = ingredients.find(
      (item) => item.id === ingredientAction.dataset.ingredientId,
    );

    if (!ingredient) {
      return;
    }

    if (ingredientAction.dataset.ingredientAction === "edit") {
      openAddFoodDialog(ingredient);
    } else {
      deletingIngredientId = ingredient.id;
      deleteConfirmationMessage.textContent = `Are you sure you want to delete ${ingredient.name}?`;
      openPhoneDialog(deleteConfirmationDialog, cancelDeleteButton);
    }
  }
});

screenContent.addEventListener("submit", (event) => {
  const recipeForm = event.target.closest('[data-form="recipe-personalization"]');

  if (recipeForm) {
    event.preventDefault();
    const budgetInput = recipeForm.querySelector("#recipe-budget");
    const customServingsInput = recipeForm.querySelector(
      "#recipe-custom-servings",
    );
    const status = recipeForm.querySelector(".recipes-status");

    if (!recipeForm.reportValidity()) {
      return;
    }

    const selectedBudget = Number(budgetInput.value);
    const selectedServings = recipeCustomServingsEnabled
      ? customServingsInput.valueAsNumber
      : Number(recipeForm.querySelector("#recipe-servings").value);
    if (
      !Number.isInteger(selectedBudget) ||
      selectedBudget < 0 ||
      selectedBudget > 20 ||
      !Number.isInteger(selectedServings) ||
      selectedServings < 1
    ) {
      if (recipeCustomServingsEnabled) {
        const errorMessage = "Enter a whole number of servings, starting at 1.";
        customServingsError.textContent = errorMessage;
        customServingsInput.setCustomValidity(errorMessage);
        customServingsInput.reportValidity();
      }
      return;
    }

    recipeBudget = selectedBudget;
    recipeServings = selectedServings;
    const matchedRecipes = recipesDatabase.filter(
      (recipe) => recipe.extraCost <= recipeBudget,
    );
    const resultsScreen = document.createElement("section");
    resultsScreen.className = "recipes-screen";
    resultsScreen.append(createProfileBackButton("Find Recipes"));
    const heading = document.createElement("h2");
    heading.textContent = matchedRecipes.length > 0
      ? "Suggested Recipes"
      : "No Recipes Found";
    const subtitle = document.createElement("p");
    subtitle.className = "recipes-subtitle";
    subtitle.textContent = matchedRecipes.length > 0
      ? `Based on your €${recipeBudget} budget, you can make these recipes:`
      : `No recipes fit your €${recipeBudget} budget. Try increasing your budget.`;
    resultsScreen.append(heading, subtitle);

    const grid = document.createElement("div");
    grid.className = "recipe-card-grid";
    matchedRecipes.forEach((recipe) => {
      grid.append(
        createRecipeCard(recipe, () => {
          screenContent.replaceChildren(
            createRecipeDetailsScreen(recipe, () => {
              screenContent.replaceChildren(resultsScreen);
            }),
          );
        }),
      );
    });

    if (matchedRecipes.length > 0) {
      resultsScreen.append(grid);
    }

    screenContent.replaceChildren(resultsScreen);
    return;
  }

  const preferenceForm = event.target.closest(
    '[data-form="edit-profile"], [data-form="dietary-preferences"], [data-form="cooking-time"], [data-form="food-allergies"], [data-form="cooking-skill"]',
  );

  if (!preferenceForm) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(preferenceForm);
  const formName = preferenceForm.dataset.form;

  if (formName === "edit-profile") {
    const nameInput = preferenceForm.querySelector("#profile-name");
    const usernameInput = preferenceForm.querySelector("#profile-username");
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();

    nameInput.setCustomValidity(name ? "" : "Enter your name.");
    usernameInput.setCustomValidity(username ? "" : "Enter your username.");

    if (!preferenceForm.reportValidity()) {
      return;
    }

    profileDetails = {
      name,
      username,
      gender: formData.get("gender"),
      selfDescribedGender: formData.get("gender") === "Self-describe"
        ? formData.get("selfDescribedGender").trim()
        : "",
    };
    showScreen("Profile");
    return;
  }

  if (formName === "food-allergies") {
    foodAllergies = formData.getAll("foodAllergies");
    customFoodAllergies = [...draftCustomFoodAllergies];
    showScreen("Profile");
    return;
  }

  if (formName === "cooking-skill") {
    const selectedSkill = formData.get("cookingSkill");
    if (typeof selectedSkill !== "string") {
      return;
    }
    cookingSkillLevel = selectedSkill;
    showScreen("Profile");
    return;
  }

  const isCookingTime = formName === "cooking-time";
  const selectedPreference = formData.get(isCookingTime ? "cookingTime" : "dietaryPreference");

  if (typeof selectedPreference !== "string") {
    return;
  }

  if (isCookingTime) {
    preferredCookingTime = selectedPreference;
  } else {
    dietaryPreference = selectedPreference;
  }
  showScreen("Profile");
});

screenContent.addEventListener("input", (event) => {
  if (event.target.matches("#profile-name, #profile-username")) {
    event.target.setCustomValidity("");
  }
});

screenContent.addEventListener("change", (event) => {
  if (event.target.matches("#profile-gender")) {
    screenContent.querySelector(".edit-profile-self-description").hidden =
      event.target.value !== "Self-describe";
  }
});

screenContent.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    event.target.matches(".custom-allergy-input")
  ) {
    event.preventDefault();
    screenContent.querySelector(".custom-allergy-add").click();
  }
});

document.querySelector("#cancel-add-food").addEventListener("click", () => {
  closePhoneDialog(addFoodDialog);
});

addFoodDialog.addEventListener("close", () => {
  if (!addFoodDialog.open) {
    restorePhoneDialog(addFoodDialog);
    resetAddFoodDialog();
  }
});

cancelDeleteButton.addEventListener("click", () => {
  closePhoneDialog(deleteConfirmationDialog);
});

confirmDeleteButton.addEventListener("click", () => {
  if (deletingIngredientId === null) {
    return;
  }

  const ingredientIndex = ingredients.findIndex(
    (ingredient) => ingredient.id === deletingIngredientId,
  );

  if (ingredientIndex !== -1) {
    ingredients.splice(ingredientIndex, 1);
    refreshIngredientViews();
  }

  deletingIngredientId = null;
  closePhoneDialog(deleteConfirmationDialog);
  screenContent.querySelector(".add-food-button")?.focus();
});

deleteConfirmationDialog.addEventListener("close", () => {
  if (!deleteConfirmationDialog.open) {
    restorePhoneDialog(deleteConfirmationDialog);
    deletingIngredientId = null;
  }
});

foodNameInput.addEventListener("input", () => {
  foodNameInput.setCustomValidity("");
});

expirationDateInput.addEventListener("change", () => {
  expirationDateInput.setCustomValidity("");
});

addFoodForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(addFoodForm);
  const category = formData.get("category");
  const name = formData.get("name").trim();
  const expirationDate = formData.get("expirationDate");

  foodNameInput.setCustomValidity(name ? "" : "Enter a food name.");
  expirationDateInput.setCustomValidity(
    expirationDate < getTodayDateString()
      ? "Expiration date cannot be in the past."
      : "",
  );

  if (!addFoodForm.reportValidity()) {
    return;
  }

  const savedIngredientId = editingIngredientId;

  if (savedIngredientId) {
    const ingredient = ingredients.find((item) => item.id === savedIngredientId);

    if (!ingredient) {
      closePhoneDialog(addFoodDialog);
      return;
    }

    Object.assign(ingredient, {
      category,
      name,
      expirationDate,
      expiresInDays: getDaysUntilDate(expirationDate),
      icon: categoryIcons[category],
    });
  } else {
    ingredients.push({
      id: `ingredient-${nextIngredientId++}`,
      category,
      name,
      expirationDate,
      expiresInDays: getDaysUntilDate(expirationDate),
      icon: categoryIcons[category],
    });
  }

  closePhoneDialog(addFoodDialog);
  refreshIngredientViews();
  const savedIngredientEditButton = Array.from(
    screenContent.querySelectorAll('[data-ingredient-action="edit"]'),
  ).find((button) => button.dataset.ingredientId === savedIngredientId) ??
    screenContent.querySelector(".add-food-button");
  savedIngredientEditButton?.focus();
});

updateFridgeCount();
renderUseFirst();

document.addEventListener("keydown", (event) => {
  if (!navigation.classList.contains("is-open")) {
    return;
  }

  if (event.key === "Escape") {
    setMenuOpen(false);
    return;
  }

  if (event.key === "Tab") {
    const focusableItems = navigation.querySelectorAll("button:not([disabled])");
    const firstItem = focusableItems[0];
    const lastItem = focusableItems[focusableItems.length - 1];

    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  }
});

const reducedMotionPreference = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

window.setTimeout(() => {
  splashScreen.classList.add("is-leaving");
  splashScreen.setAttribute("aria-hidden", "true");
  splashScreen.inert = true;

  window.setTimeout(
    () => {
      splashScreen.hidden = true;
      for (const [element, wasInert] of splashInertStates) {
        element.inert = wasInert;
      }
    },
    reducedMotionPreference ? 30 : 340,
  );
}, reducedMotionPreference ? 1950 : 1680);