# pop-carousel

A responsive carousel/slider component built with StencilJS. Provides better TypeScript support and reactivity compared to vanilla web components.

## Features

- ✅ Built with StencilJS
- ✅ Full TypeScript support
- ✅ Responsive and accessible
- ✅ Previous/Next navigation
- ✅ Gallery mode (grid view)
- ✅ Programmatic control with async methods
- ✅ Auto-adjusts height
- ✅ Smooth transitions
- ✅ Shadow DOM for style encapsulation

## Usage

### Basic Example

```html
<pop-carousel class="loading">
  <div class="slide">
    <img src="image1.jpg" alt="Slide 1" />
  </div>
  <div class="slide">
    <img src="image2.jpg" alt="Slide 2" />
  </div>
  <div class="slide">
    <img src="image3.jpg" alt="Slide 3" />
  </div>
</pop-carousel>
```

### In Astro

```astro
---
import '@popcorn245/ui-kit';
---

<pop-carousel class="loading">
  <div class="slide">
    <img src="photo.jpg" alt="Photo" />
  </div>
</pop-carousel>
```

### In React

```jsx
import '@popcorn245/ui-kit';

function MyComponent() {
  const handleSlideChange = async () => {
    const carousel = document.getElementById('my-carousel');
    await carousel.slideTo(2);
  };

  return (
    <pop-carousel id="my-carousel" className="loading">
      <div className="slide">
        <img src="image.jpg" alt="Slide" />
      </div>
    </pop-carousel>
  );
}
```

## API

### Methods

#### `slideTo(index: number): Promise<void>`

Navigate to a specific slide by index.

```javascript
const carousel = document.querySelector('pop-carousel');
await carousel.slideTo(2); // Go to third slide
```

#### `viewGallery(): Promise<void>`

Enable gallery mode to display all slides in a grid.

```javascript
const carousel = document.querySelector('pop-carousel');
await carousel.viewGallery();
```

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--slide-height` | auto | Height of the carousel (auto-calculated) |
| `--transition-delay-time` | 0.5s | Button visibility transition delay |

## Styling

```css
/* Customize button appearance */
pop-carousel::part(button) {
  background: var(--pico-primary);
  color: white;
}

/* Adjust grid in gallery mode */
pop-carousel.gallery {
  --grid-columns: 4; /* Default is 3 */
}
```

## Why StencilJS?

- **Better TypeScript Support:** Full type definitions and intellisense
- **Reactive State:** Automatic re-rendering with @State decorators  
- **Better Testing:** Built-in testing utilities
- **Framework Agnostic:** Works with React, Vue, Angular, or vanilla JS
- **Smaller Bundle:** Optimized output with lazy loading

## Migration from ui-slider

If you're migrating from the old `ui-slider` component:

1. Replace `<ui-slider>` with `<pop-carousel>`
2. Methods are now async: `await carousel.slideTo(0)` instead of `carousel.slideTo(0)`
3. Everything else works the same!

---

<!-- Auto Generated Below -->


## Methods

### `next() => Promise<void>`

Scrolls the carousel to the next slide.

#### Returns

Type: `Promise<void>`



### `prev() => Promise<void>`

Scrolls the carousel to the previous slide.

#### Returns

Type: `Promise<void>`



### `slideTo(index: number) => Promise<void>`

Scrolls to a specific slide by index.

#### Parameters

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `index` | `number` |             |

#### Returns

Type: `Promise<void>`



### `viewGallery() => Promise<void>`

Switches the carousel to gallery view (grid).

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
