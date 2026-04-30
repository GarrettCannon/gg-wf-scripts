import { defineConfig } from "vitepress";
import llmstxt from "vitepress-plugin-llms";

export default defineConfig({
	vite: {
		plugins: [
			llmstxt({
				domain: "https://garrettcannon.dev",
				ignoreFiles: ["index.md"],
			}),
		],
	},
	title: "gg-wf-scripts",
	description:
		"A declarative attribute engine for Webflow sites. Add gg-* attributes to your markup and the library handles data binding, URL-driven state, dialogs, auth gating, form visibility, and user actions.",
	base: "/gg-wf-scripts/",
	cleanUrls: true,
	lastUpdated: true,
	sitemap: { hostname: "https://garrettcannon.dev/gg-wf-scripts/" },
	head: [
		["link", { rel: "icon", href: "/gg-wf-scripts/favicon.ico" }],
	],
	themeConfig: {
		nav: [
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "Attributes", link: "/attributes/data" },
			{ text: "API", link: "/api/init" },
			{
				text: "GitHub",
				link: "https://github.com/GarrettCannon/gg-wf-scripts",
			},
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Getting started", link: "/guide/getting-started" },
					{ text: "Installation", link: "/guide/installation" },
				],
			},
			{
				text: "Attributes",
				items: [
					{ text: "Data binding", link: "/attributes/data" },
					{ text: "URL query params", link: "/attributes/url-params" },
					{ text: "Content switcher", link: "/attributes/switcher" },
					{ text: "Dialog", link: "/attributes/dialog" },
					{ text: "Auth and roles", link: "/attributes/auth" },
					{ text: "Forms", link: "/attributes/forms" },
					{ text: "Actions", link: "/attributes/actions" },
					{ text: "Loading and confirm", link: "/attributes/loading" },
				],
			},
			{
				text: "API",
				items: [
					{ text: "init()", link: "/api/init" },
					{ text: "Registering handlers", link: "/api/registration" },
					{ text: "Exports", link: "/api/exports" },
				],
			},
			{
				text: "For LLMs",
				items: [
					{
						text: "llms.txt",
						link: "https://garrettcannon.dev/gg-wf-scripts/llms.txt",
						target: "_blank",
					},
					{
						text: "llms-full.txt",
						link: "https://garrettcannon.dev/gg-wf-scripts/llms-full.txt",
						target: "_blank",
					},
				],
			},
		],
		socialLinks: [
			{
				icon: "github",
				link: "https://github.com/GarrettCannon/gg-wf-scripts",
			},
		],
		search: {
			provider: "local",
		},
		editLink: {
			pattern:
				"https://github.com/GarrettCannon/gg-wf-scripts/edit/main/docs/:path",
			text: "Edit this page on GitHub",
		},
		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © Garrett Cannon",
		},
	},
});
