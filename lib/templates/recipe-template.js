export function renderRecipeToHtml(recipeData, options = {}) {
  let recipe = recipeData;
  if (typeof recipeData === 'string') {
    try {
      recipe = JSON.parse(recipeData);
    } catch {
      recipe = { name: options.title || 'Recipe', recipeInstructions: [recipeData] };
    }
  }

  const title = recipe.name || options.title || 'Delicious Recipe';
  const yieldServings = recipe.recipeYield || '4 servings';
  const totalTime = recipe.totalTime ? recipe.totalTime.replace(/^PT/, '').replace(/M$/, ' mins') : (recipe.cookTime || '30 mins');
  const ingredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
  
  let instructions = [];
  if (Array.isArray(recipe.recipeInstructions)) {
    instructions = recipe.recipeInstructions.map(i => (typeof i === 'string' ? i : (i.text || '')));
  } else if (typeof recipe.recipeInstructions === 'string') {
    instructions = recipe.recipeInstructions.split(/\n+/).filter(Boolean);
  }

  const image = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #faf8f5;
      --card: #ffffff;
      --fg: #2c2523;
      --muted: #7c726e;
      --accent: #d9480f;
      --border: #eedfd7;
      --highlight: #fff4e6;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1716;
        --card: #25211f;
        --fg: #f5ece8;
        --muted: #a89f9b;
        --accent: #ff922b;
        --border: #3d3633;
        --highlight: #2e2621;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Georgia, serif;
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .recipe-card {
      max-width: 750px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    }
    .recipe-hero {
      position: relative;
      ${image ? `background-image: url('${escapeHtml(image)}'); background-size: cover; background-position: center; min-height: 280px;` : 'background: linear-gradient(135deg, var(--accent), #ff922b); min-height: 140px;'}
      display: flex;
      align-items: flex-end;
      padding: 2rem;
    }
    .recipe-hero-overlay {
      position: absolute;
      top:0; left:0; right:0; bottom:0;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 100%);
    }
    .hero-title {
      position: relative;
      color: #fff;
      font-size: 2.2rem;
      font-weight: 700;
      text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }
    .recipe-body {
      padding: 2rem;
    }
    .meta-bar {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.95rem;
      color: var(--muted);
      flex-wrap: wrap;
    }
    .meta-item strong { color: var(--fg); }
    h2 {
      font-size: 1.35rem;
      margin: 1.5rem 0 1rem;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    ul.ingredients {
      list-style: none;
      margin-bottom: 2rem;
    }
    ul.ingredients li {
      padding: 0.6rem 0.8rem;
      border-bottom: 1px dashed var(--border);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }
    ul.ingredients li:hover {
      background: var(--highlight);
    }
    ul.ingredients li input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
    }
    ol.instructions {
      padding-left: 1.5rem;
    }
    ol.instructions li {
      margin-bottom: 1.25rem;
      padding-left: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="recipe-card">
    <div class="recipe-hero">
      <div class="recipe-hero-overlay"></div>
      <h1 class="hero-title">${escapeHtml(title)}</h1>
    </div>
    <div class="recipe-body">
      <div class="meta-bar">
        <div class="meta-item">⏱ Time: <strong>${escapeHtml(totalTime)}</strong></div>
        <div class="meta-item">🍽 Yield: <strong>${escapeHtml(yieldServings)}</strong></div>
        ${recipe.nutrition?.calories ? `<div class="meta-item">🔥 Calories: <strong>${escapeHtml(recipe.nutrition.calories)}</strong></div>` : ''}
      </div>

      ${ingredients.length ? `
        <h2>Ingredients</h2>
        <ul class="ingredients">
          ${ingredients.map(ing => `<li><label style="display:flex;align-items:center;gap:0.75rem;width:100%;cursor:pointer;"><input type="checkbox"> <span>${escapeHtml(ing)}</span></label></li>`).join('')}
        </ul>
      ` : ''}

      ${instructions.length ? `
        <h2>Instructions</h2>
        <ol class="instructions">
          ${instructions.map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
        </ol>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
