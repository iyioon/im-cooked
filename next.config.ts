import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // AllRecipes
      { protocol: 'https', hostname: '**.allrecipes.com' },
      // The Kitchn
      { protocol: 'https', hostname: '**.thekitchn.com' },
      // Simply Recipes
      { protocol: 'https', hostname: '**.simplyrecipes.com' },
      // Bon Appétit
      { protocol: 'https', hostname: '**.bonappetit.com' },
      // Epicurious
      { protocol: 'https', hostname: '**.epicurious.com' },
      // Food Network
      { protocol: 'https', hostname: '**.foodnetwork.com' },
      // Taste of Home
      { protocol: 'https', hostname: '**.tasteofhome.com' },
      // King Arthur Baking
      { protocol: 'https', hostname: '**.kingarthurbaking.com' },
      // Sally's Baking Addiction
      { protocol: 'https', hostname: '**.sallysbakingaddiction.com' },
      { protocol: 'https', hostname: 'sallysbakingaddiction.com' },
      // Minimalist Baker
      { protocol: 'https', hostname: '**.minimalistbaker.com' },
      { protocol: 'https', hostname: 'minimalistbaker.com' },
      // Pinch of Yum
      { protocol: 'https', hostname: '**.pinchofyum.com' },
      { protocol: 'https', hostname: 'pinchofyum.com' },
      // Cookie and Kate
      { protocol: 'https', hostname: '**.cookieandkate.com' },
      { protocol: 'https', hostname: 'cookieandkate.com' },
      // Budget Bytes
      { protocol: 'https', hostname: '**.budgetbytes.com' },
      // The Woks of Life
      { protocol: 'https', hostname: '**.thewoksoflife.com' },
      { protocol: 'https', hostname: 'thewoksoflife.com' },
      // Just One Cookbook
      { protocol: 'https', hostname: '**.justonecookbook.com' },
      // Maangchi
      { protocol: 'https', hostname: '**.maangchi.com' },
      // Rasa Malaysia
      { protocol: 'https', hostname: '**.rasamalaysia.com' },
      { protocol: 'https', hostname: 'rasamalaysia.com' },
      // Veg Recipes of India
      { protocol: 'https', hostname: '**.vegrecipesofindia.com' },
      // Immaculate Bites
      { protocol: 'https', hostname: '**.immaculatebites.com' },
      // Mexico in My Kitchen
      { protocol: 'https', hostname: '**.mexicoinmykitchen.com' },
      // Gimme Some Oven
      { protocol: 'https', hostname: '**.gimmesomeoven.com' },
      // Love and Lemons
      { protocol: 'https', hostname: '**.loveandlemons.com' },
      // Cafe Delites
      { protocol: 'https', hostname: '**.cafedelites.com' },
      { protocol: 'https', hostname: 'cafedelites.com' },
      // Natasha's Kitchen
      { protocol: 'https', hostname: '**.natashaskitchen.com' },
      { protocol: 'https', hostname: 'natashaskitchen.com' },
      // Tasty
      { protocol: 'https', hostname: '**.tasty.co' },
      { protocol: 'https', hostname: 'tasty.co' },
      // Joshua Weissman
      { protocol: 'https', hostname: '**.joshuaweissman.com' },
      // Sorted Food
      { protocol: 'https', hostname: '**.sortedfood.com' },
      { protocol: 'https', hostname: 'sortedfood.com' },
    ],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    qualities: [75, 90],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
