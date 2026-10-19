/** A mixin factory with a named class inside. */
export const withCount = (Base) => {
    class WithCount extends Base {
        constructor() {
            super();
        }
        count = 0;
        step = 1;
        async increment() {
            this.count += this.step;
        }
    }
    return WithCount;
};
/** A mixin factory returning an anonymous class. */
export const withLabel = (Base) => class extends Base {
    label = 'Label';
    labelChanged() {
        console.log(this.label);
    }
};
/** A function declaration factory. */
export function withTheme(Base) {
    class WithTheme extends Base {
        constructor() {
            super();
        }
        theme = 'light';
    }
    return WithTheme;
}
//# sourceMappingURL=mixins.js.map