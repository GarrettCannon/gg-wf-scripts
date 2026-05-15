import { animate, type AnimationPlaybackControls, type Easing } from "motion";

/**
 * Centralized show/hide for every engine that toggles element visibility
 * (auth-engine, switch-engine, form-visibility, data-engine clones).
 * Defaults to instant display:none toggles; opt into fading by passing a
 * transition option to init(). Built on motion.dev so future motions
 * (springs, stagger, transforms, scroll/inView) can share the same plumbing.
 */

const config: { duration: number; ease: Easing } = {
	duration: 0,
	ease: "easeInOut",
};

export function setTransitionConfig(next: {
	duration?: number;
	easing?: Easing;
}): void {
	if (next.duration !== undefined)
		config.duration = Math.max(0, next.duration);
	if (next.easing !== undefined) config.ease = next.easing;
}

const targets = new WeakMap<HTMLElement, boolean>();
const animations = new WeakMap<HTMLElement, AnimationPlaybackControls>();

function reduceMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

function effectiveDuration(): number {
	return reduceMotion() ? 0 : config.duration;
}

function show(el: HTMLElement, instant: boolean): void {
	if (targets.get(el) === true) return;
	targets.set(el, true);
	animations.get(el)?.stop();

	el.style.display = "";
	el.removeAttribute("inert");
	el.removeAttribute("aria-hidden");

	const duration = instant ? 0 : effectiveDuration();
	if (duration === 0) {
		el.style.opacity = "";
		return;
	}

	el.style.opacity = "0";
	const anim = animate(
		el,
		{ opacity: 1 },
		{ duration: duration / 1000, ease: config.ease },
	);
	animations.set(el, anim);
}

function hide(el: HTMLElement, instant: boolean): void {
	if (targets.get(el) === false) return;
	targets.set(el, false);
	animations.get(el)?.stop();

	el.setAttribute("inert", "");
	el.setAttribute("aria-hidden", "true");

	const duration = instant ? 0 : effectiveDuration();
	if (duration === 0) {
		el.style.opacity = "";
		el.style.display = "none";
		return;
	}

	const anim = animate(
		el,
		{ opacity: 0 },
		{ duration: duration / 1000, ease: config.ease },
	);
	animations.set(el, anim);
	anim.then(
		() => {
			if (animations.get(el) !== anim) return;
			el.style.display = "none";
		},
		() => {
			/* superseded by a later setVisibility call */
		},
	);
}

export function setVisibility(
	el: HTMLElement,
	visible: boolean,
	options?: { instant?: boolean },
): void {
	const instant = options?.instant === true;
	if (visible) show(el, instant);
	else hide(el, instant);
}

/**
 * False when the element or any ancestor has `display: none`. The data engine
 * uses this to skip queries on hidden tabs/panels and defer them to whenever
 * the element actually gets rendered. Uses the native `checkVisibility()` API
 * where available (Baseline 2024) and walks `getComputedStyle` ancestors as a
 * fallback for older Safari/Firefox.
 */
export function isDisplayed(el: Element): boolean {
	if (typeof window === "undefined") return true;
	if (!(el instanceof HTMLElement)) return true;
	if (typeof el.checkVisibility === "function") return el.checkVisibility();
	let cur: HTMLElement | null = el;
	while (cur) {
		if (getComputedStyle(cur).display === "none") return false;
		cur = cur.parentElement;
	}
	return true;
}
