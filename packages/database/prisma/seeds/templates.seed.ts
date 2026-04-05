// prisma/seeds/templates.seed.ts
// Run with: npx ts-node prisma/seeds/templates.seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES: Omit<Parameters<typeof prisma.template.create>[0]['data'], 'id'>[] = [
  {
    name: "Modern SaaS Landing",
    description:
      "Clean, conversion-focused landing page for SaaS products. Includes hero, features, pricing, and CTA sections.",
    category: "SAAS" as const,
    framework: "REACT" as const,
    previewUrl: "https://your-cdn.com/templates/saas-landing-preview.png",
    demoUrl: "https://demo.yourdomain.com/saas-landing",
    tags: ["saas", "landing", "modern", "dark"],
    isPremium: false,
    dependencies: {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      tailwindcss: "^3.0.0",
    },
    files: [
      {
        path: "src/App.tsx",
        content: `import React from 'react';
import Hero from './components/Hero';
import Features from './components/Features';
import Pricing from './components/Pricing';

export default function App() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Hero />
      <Features />
      <Pricing />
    </main>
  );
}`,
      },
      {
        path: "src/components/Hero.tsx",
        content: `import React from 'react';

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-bold mb-6">
        Build faster with <span className="text-blue-500">your product</span>
      </h1>
      <p className="text-xl text-gray-400 mb-8 max-w-2xl">
        The all-in-one platform for modern teams. Ship faster, collaborate better.
      </p>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold">
        Get started free
      </button>
    </section>
  );
}`,
      },
      {
        path: "src/main.tsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        path: "src/index.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
    ],
  },
  {
    name: "Developer Portfolio",
    description:
      "Minimal portfolio for developers and designers. Showcases projects, skills, and contact info.",
    category: "PORTFOLIO" as const,
    framework: "REACT" as const,
    previewUrl: "https://your-cdn.com/templates/portfolio-preview.png",
    demoUrl: "https://demo.yourdomain.com/portfolio",
    tags: ["portfolio", "minimal", "developer", "dark"],
    isPremium: false,
    dependencies: {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      tailwindcss: "^3.0.0",
    },
    files: [
      {
        path: "src/App.tsx",
        content: `import React from 'react';

export default function App() {
  return (
    <main className="min-h-screen bg-white text-gray-900 max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-5xl font-bold mb-4">Hi, I'm John Doe</h1>
      <p className="text-xl text-gray-500 mb-12">
        Full-stack developer building products people love.
      </p>
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Projects</h2>
        <div className="grid gap-6">
          {['Project One', 'Project Two', 'Project Three'].map((p) => (
            <div key={p} className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg">{p}</h3>
              <p className="text-gray-500 mt-2">A short description of this project.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}`,
      },
      {
        path: "src/main.tsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);`,
      },
      {
        path: "src/index.css",
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
      },
    ],
  },
  {
    name: "E-Commerce Store",
    description:
      "Full-featured storefront with product grid, cart, and checkout flow. Premium template.",
    category: "ECOMMERCE" as const,
    framework: "REACT" as const,
    previewUrl: "https://your-cdn.com/templates/ecommerce-preview.png",
    demoUrl: "https://demo.yourdomain.com/ecommerce",
    tags: ["ecommerce", "store", "shop", "products"],
    isPremium: true,
    dependencies: {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      tailwindcss: "^3.0.0",
    },
    files: [
      {
        path: "src/App.tsx",
        content: `import React, { useState } from 'react';

const PRODUCTS = [
  { id: 1, name: 'Product One',   price: 29, image: 'https://via.placeholder.com/400x300' },
  { id: 2, name: 'Product Two',   price: 49, image: 'https://via.placeholder.com/400x300' },
  { id: 3, name: 'Product Three', price: 99, image: 'https://via.placeholder.com/400x300' },
];

export default function App() {
  const [cart, setCart] = useState<number[]>([]);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">My Store</h1>
        <span className="text-gray-600">Cart ({cart.length})</span>
      </header>
      <section className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-3 gap-8">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <img src={p.image} alt={p.name} className="w-full" />
            <div className="p-6">
              <h2 className="font-semibold text-lg">{p.name}</h2>
              <p className="text-gray-500 mt-1">\${p.price}</p>
              <button
                onClick={() => setCart([...cart, p.id])}
                className="mt-4 w-full bg-black text-white py-2 rounded-lg"
              >
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}`,
      },
      {
        path: "src/main.tsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);`,
      },
      {
        path: "src/index.css",
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
      },
    ],
  },
];

async function main() {
  console.log("Seeding templates…");

  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.name.toLowerCase().replace(/\s+/g, "-") },
      update: template,
      create: {
        id: template.name.toLowerCase().replace(/\s+/g, "-"),
        ...template,
      },
    });
    console.log(`✅ ${template.name}`);
  }

  console.log(`\nSeeded ${TEMPLATES.length} templates`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
