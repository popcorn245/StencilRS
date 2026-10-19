import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopFilePreviewStyle0 from "./ui-kit/molecules/file-preview/file-preview.css?tag=pop-file-preview&encapsulation=scoped";
export const PopFilePreview = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popFileRemove = __stencil_createEvent(this, "popFileRemove", 7);
    }
    /** JSON array of {name, url, type} objects */
    files = '[]';
    /** Emitted when a file remove button is clicked, with the index */
    popFileRemove;
    get parsedFiles() {
        try {
            return JSON.parse(this.files);
        }
        catch {
            return [];
        }
    }
    render() {
        const items = this.parsedFiles;
        if (items.length === 0)
            return null;
        return (h("div", { class: "file-preview-area" }, items.map((file, i) => (h("div", { class: "file-preview-card", key: i },
            h("img", { src: file.url, alt: file.name || 'Preview' }),
            h("button", { class: "remove-file-btn", onClick: () => this.popFileRemove.emit(i) }, "\u2715"))))));
    }
};
PopFilePreview.style = PopFilePreviewStyle0();
//# sourceMappingURL=file-preview.js.map