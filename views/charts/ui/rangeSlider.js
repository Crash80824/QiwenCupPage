 
export function createRangeSlider(
	container,
	{ min, max, value, onChange, format, getRect },
) {
	const slider = document.createElement("div");
	slider.className = "dumbbell-slider";
	const track = document.createElement("div");
	track.className = "dumbbell-slider-track";
	const fill = document.createElement("div");
	fill.className = "dumbbell-slider-fill";
	const thumb = document.createElement("div");
	thumb.className = "dumbbell-slider-thumb";
	const tag = document.createElement("div");
	tag.className = "dumbbell-slider-tag";
	thumb.appendChild(tag);
	slider.appendChild(track);
	slider.appendChild(fill);
	slider.appendChild(thumb);
	container.appendChild(slider);

	let current = value;
	const fracOf = (ms) => (ms - min) / (max - min);
	const positionThumb = () => {
		const pct = Math.max(0, Math.min(1, fracOf(current))) * 100;
		thumb.style.left = pct + "%";
		fill.style.width = pct + "%";
		tag.textContent = format(current);
	};
	const layout = () => {
		const r = getRect();
		if (r) {
			slider.style.left = r.x + "px";
			slider.style.width = r.width + "px";
			slider.style.top = r.y + r.height + 52 + "px";
		} else {
			slider.style.left = "48px";
			slider.style.width = Math.max(120, container.clientWidth - 88) + "px";
			slider.style.top = container.clientHeight - 34 + "px";
		}
		positionThumb();
	};
	const setValue = (ms) => {
		const clamped = Math.max(min, Math.min(max, ms));
		if (clamped === current) return;
		current = clamped;
		onChange(current);
		positionThumb();
	};
	const msFromClientX = (clientX) => {
		const r = track.getBoundingClientRect();
		let f = (clientX - r.left) / (r.width || 1);
		f = Math.max(0, Math.min(1, f));
		return min + f * (max - min);
	};
	const onMove = (e) => {
		setValue(msFromClientX(e.clientX));
		e.preventDefault();
	};
	const onUp = () => {
		slider.classList.remove("dragging");
		window.removeEventListener("pointermove", onMove);
		window.removeEventListener("pointerup", onUp);
	};
	const startDrag = (e) => {
		e.preventDefault();
		slider.classList.add("dragging");
		onMove(e); 
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};
	thumb.addEventListener("pointerdown", startDrag);
	track.addEventListener("pointerdown", startDrag);

	layout();
	return { layout, setValue };
}
