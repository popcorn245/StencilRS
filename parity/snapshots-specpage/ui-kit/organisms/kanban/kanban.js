import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopKanban = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardMoved = __stencil_createEvent(this, "popCardMoved", 7);
        this.popCardClicked = __stencil_createEvent(this, "popCardClicked", 7);
        this.popCreateTask = __stencil_createEvent(this, "popCreateTask", 7);
    }
    get el() { return __stencil_getElement(this); }
    /**
     * JSON string of KanbanColumn[]. Each column has { id, label, color? }.
     */
    columns = '[]';
    /**
     * JSON string of KanbanCard[]. Each card has { id, title, description?, columnId, repo?, prUrl?, prNumber?, createdAt?, badge? }.
     */
    cards = '[]';
    /**
     * Whether the board is in a loading state
     */
    loading = false;
    /**
     * JSON string of column IDs that are terminal (no drops allowed). Defaults to ["merged","closed"].
     */
    terminalColumnIds = '["merged","closed"]';
    /**
     * Filter cards to only show those assigned to this name. Empty string shows all.
     */
    filterAssignee = '';
    /**
     * Emitted when a card is dragged to a new column. Detail: { cardId, fromColumnId, toColumnId }
     */
    popCardMoved;
    /**
     * Emitted when a card is clicked. Detail: { cardId }
     */
    popCardClicked;
    /**
     * Emitted when the "New task" button is clicked. Detail: { columnId }
     */
    popCreateTask;
    draggingCardId = null;
    dragOverColumnId = null;
    parsedColumns() {
        try {
            return typeof this.columns === 'string' ? JSON.parse(this.columns) : this.columns;
        }
        catch {
            return [];
        }
    }
    parsedCards() {
        try {
            return typeof this.cards === 'string' ? JSON.parse(this.cards) : this.cards;
        }
        catch {
            return [];
        }
    }
    getTerminalColumns() {
        try {
            const ids = typeof this.terminalColumnIds === 'string'
                ? JSON.parse(this.terminalColumnIds)
                : this.terminalColumnIds;
            return new Set(Array.isArray(ids) ? ids : []);
        }
        catch {
            return new Set(['merged', 'closed']);
        }
    }
    cardsForColumn(columnId, allCards) {
        return allCards.filter(c => {
            if (c.columnId !== columnId)
                return false;
            if (this.filterAssignee && c.assignees) {
                return c.assignees.includes(this.filterAssignee);
            }
            return true;
        });
    }
    isOverdue(dueDate) {
        return dueDate < Date.now();
    }
    handleDragStart = (e, card) => {
        this.draggingCardId = card.id;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.id);
        }
    };
    handleDragEnd = () => {
        this.draggingCardId = null;
        this.dragOverColumnId = null;
    };
    handleDragOver = (e, columnId) => {
        if (this.getTerminalColumns().has(columnId))
            return;
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'move';
        this.dragOverColumnId = columnId;
    };
    handleDragLeave = (e) => {
        // Only clear if leaving the column entirely (not entering a child)
        const related = e.relatedTarget;
        const column = e.currentTarget;
        if (!column.contains(related)) {
            this.dragOverColumnId = null;
        }
    };
    handleDrop = (e, toColumnId) => {
        e.preventDefault();
        if (this.getTerminalColumns().has(toColumnId))
            return;
        const cardId = e.dataTransfer?.getData('text/plain') || this.draggingCardId;
        if (!cardId)
            return;
        const allCards = this.parsedCards();
        const card = allCards.find(c => c.id === cardId);
        if (!card || card.columnId === toColumnId) {
            this.draggingCardId = null;
            this.dragOverColumnId = null;
            return;
        }
        this.popCardMoved.emit({ cardId, fromColumnId: card.columnId, toColumnId });
        this.draggingCardId = null;
        this.dragOverColumnId = null;
    };
    formatDate(ts) {
        if (!ts)
            return '';
        const d = new Date(ts);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    renderCard(card) {
        const isDragging = this.draggingCardId === card.id;
        return (h("article", { key: card.id, class: { 'kanban-card': true, 'is-dragging': isDragging }, draggable: true, onDragStart: e => this.handleDragStart(e, card), onDragEnd: this.handleDragEnd, onClick: () => this.popCardClicked.emit({ cardId: card.id }), role: "button", tabIndex: 0, onKeyDown: e => e.key === 'Enter' && this.popCardClicked.emit({ cardId: card.id }) },
            h("header", { class: "kanban-card__header" },
                h("span", { class: "kanban-card__title" }, card.title),
                card.badge && h("mark", { class: `kanban-card__badge kanban-card__badge--${card.badge}` }, card.badge)),
            card.description && (h("p", { class: "kanban-card__description" }, card.description)),
            (card.questTitle || card.dueDate || card.xp !== undefined) && (h("div", { class: "kanban-card__chips" },
                card.questTitle && (h("span", { class: "kanban-card__chip kanban-card__chip--quest" },
                    "\u2694 ",
                    card.questTitle)),
                card.dueDate && (h("span", { class: `kanban-card__chip kanban-card__chip--due${this.isOverdue(card.dueDate) ? ' is-overdue' : ''}` },
                    "\uD83D\uDCC5 ",
                    this.formatDate(card.dueDate))),
                card.xp !== undefined && (h("span", { class: "kanban-card__chip kanban-card__chip--xp" },
                    "\u26A1 ",
                    card.xp,
                    " XP")))),
            card.assignees?.length > 0 && (h("div", { class: "kanban-card__assignees" }, card.assignees.map(a => (h("span", { class: "kanban-card__avatar", title: a }, a.slice(0, 1).toUpperCase()))))),
            h("footer", { class: "kanban-card__footer" },
                card.repo && h("small", { class: "kanban-card__repo" }, card.repo),
                h("div", { class: "kanban-card__meta" },
                    card.prNumber && (h("a", { class: "kanban-card__pr-link", href: card.prUrl || '#', target: "_blank", rel: "noopener noreferrer", onClick: e => e.stopPropagation(), title: `Open PR #${card.prNumber}` },
                        h("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" },
                            h("path", { d: "M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" })),
                        "#",
                        card.prNumber)),
                    card.createdAt && h("small", { class: "kanban-card__date" }, this.formatDate(card.createdAt))))));
    }
    renderColumn(column, cards, terminalCols) {
        const isDragOver = this.dragOverColumnId === column.id;
        const isTerminal = terminalCols.has(column.id);
        const columnCards = this.cardsForColumn(column.id, cards);
        return (h("section", { key: column.id, class: { 'kanban-column': true, 'is-drag-over': isDragOver }, style: column.color ? { '--column-accent': column.color } : {}, onDragOver: e => this.handleDragOver(e, column.id), onDragLeave: this.handleDragLeave, onDrop: e => this.handleDrop(e, column.id) },
            h("header", { class: "kanban-column__header" },
                h("span", { class: "kanban-column__label" }, column.label),
                h("div", { class: "kanban-column__header-meta" },
                    h("span", { class: "kanban-column__count" }, columnCards.length),
                    !isTerminal && (h("button", { class: "kanban-column__add-btn", title: "Add task", onClick: () => this.popCreateTask.emit({ columnId: column.id }) }, "+")))),
            h("div", { class: "kanban-column__cards" },
                columnCards.length === 0 && !isDragOver && (h("div", { class: "kanban-column__empty" }, isTerminal ? 'No tasks' : 'Drop here')),
                columnCards.map(card => this.renderCard(card)),
                isDragOver && h("div", { class: "kanban-column__drop-indicator" }))));
    }
    render() {
        if (this.loading) {
            return (h("div", { class: "kanban-loading", "aria-busy": "true" },
                h("slot", { name: "loading" }, "Loading board\u2026")));
        }
        const columns = this.parsedColumns();
        const cards = this.parsedCards();
        const terminalCols = this.getTerminalColumns();
        return (h("div", { class: "kanban-board" }, columns.map(col => this.renderColumn(col, cards, terminalCols))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-kanban",
        "componentClassName": "PopKanban",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "columns",
                "type": "string",
                "attribute": "columns",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON string of KanbanColumn[]. Each column has { id, label, color? }."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "cards",
                "type": "string",
                "attribute": "cards",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON string of KanbanCard[]. Each card has { id, title, description?, columnId, repo?, prUrl?, prNumber?, createdAt?, badge? }."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "loading",
                "type": "boolean",
                "attribute": "loading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether the board is in a loading state"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "terminalColumnIds",
                "type": "string",
                "attribute": "terminal-column-ids",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[\"merged\",\"closed\"]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON string of column IDs that are terminal (no drops allowed). Defaults to [\"merged\",\"closed\"]."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "filterAssignee",
                "type": "string",
                "attribute": "filter-assignee",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Filter cards to only show those assigned to this name. Empty string shows all."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "draggingCardId"
            }, {
                "name": "dragOverColumnId"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popCardMoved",
                "method": "popCardMoved",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when a card is dragged to a new column. Detail: { cardId, fromColumnId, toColumnId }"
                },
                "complexType": {
                    "original": "{ cardId: string; fromColumnId: string; toColumnId: string }",
                    "resolved": "{ cardId: string; fromColumnId: string; toColumnId: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCardClicked",
                "method": "popCardClicked",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when a card is clicked. Detail: { cardId }"
                },
                "complexType": {
                    "original": "{ cardId: string }",
                    "resolved": "{ cardId: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popCreateTask",
                "method": "popCreateTask",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the \"New task\" button is clicked. Detail: { columnId }"
                },
                "complexType": {
                    "original": "{ columnId: string }",
                    "resolved": "{ columnId: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-KANBAN",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/kanban/kanban.css",
                        "relativePath": "kanban.css",
                        "originalComponentPath": "kanban.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "draggable", "onDragStart", "onDragEnd", "onClick", "role", "tabIndex", "onKeyDown", "title", "href", "target", "rel", "width", "height", "viewBox", "fill", "aria-hidden", "d", "style", "onDragOver", "onDragLeave", "onDrop", "aria-busy", "name"],
        "htmlTagNames": ["article", "header", "span", "mark", "p", "div", "footer", "small", "a", "svg", "path", "section", "button", "slot"],
        "htmlParts": [],
        "htmlSlots": ["loading"],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=kanban.js.map