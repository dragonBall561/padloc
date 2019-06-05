import { TemplateResult } from "lit-html";
import { guard } from "lit-html/directives/guard";
import { BaseElement, element, property, html, css, observe, listen } from "./base";
import { mixins } from "../styles";

@element("pl-virtual-list")
export class VirtualList<T> extends BaseElement {
    @property()
    data: T[] = [];

    @property()
    minItemWidth: number;

    @property()
    itemHeight: number;

    @property()
    renderItem: (data: T) => TemplateResult;

    get firstIndex() {
        return this._firstIndex;
    }
    get lastIndex() {
        return this._lastIndex;
    }

    private _firstIndex: number;
    private _lastIndex: number;
    private _height: number;
    private _width: number;
    private _elementCount: number;
    private _canvasHeight: number;
    private _itemWidth: number;
    private _itemsPerRow: number;

    private _elements: {
        data: T | null;
        x: number;
        y: number;
    }[] = [];

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("scroll", () => this._updateIndizes(), { passive: true });
    }

    @observe("data", "itemMinWidth", "minItemWidth", "itemHeight")
    @listen("resize", window)
    _updateBounds() {
        this._width = this.offsetWidth;
        this._height = this.offsetHeight;
        this._itemsPerRow = Math.floor(this._width / (this.minItemWidth || this._width));
        this._itemWidth = this._width / this._itemsPerRow;
        const rowCount = Math.ceil(this.data.length / this._itemsPerRow);
        this._canvasHeight = rowCount * this.itemHeight;
        this._elementCount = Math.ceil(this._height / this.itemHeight + 1) * this._itemsPerRow;

        const els = [];
        for (let i = 0; i < this._elementCount; i++) {
            els.push({ data: null, x: 0, y: 0 });
        }
        this._elements = els;
        this._updateIndizes();
        this._updateElements();
    }

    _updateIndizes() {
        const oldFirstIndex = this._firstIndex;
        const oldLastIndex = this._lastIndex;
        this._firstIndex = Math.max(Math.floor(this.scrollTop / this.itemHeight) * this._itemsPerRow, 0);
        this._lastIndex = Math.min(this._firstIndex + this._elements.length, this.data.length) - 1;
        if (this._firstIndex !== oldFirstIndex || this._lastIndex !== oldLastIndex) {
            this._updateElements();
        }
    }

    _updateElements() {
        for (let i = this._firstIndex; i <= this._lastIndex; i++) {
            const elIndex = i % this._elements.length;
            Object.assign(this._elements[elIndex], {
                data: this.data[i],
                x: (i % this._itemsPerRow) * this._itemWidth,
                y: Math.floor(i / this._itemsPerRow) * this.itemHeight
            });
        }
        this.requestUpdate();
    }

    createRenderRoot() {
        return this;
    }

    static styles = [
        css`
            :host {
                ${mixins.scroll()}
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }

            ::slotted(.content) {
                position: relative;
            }

            ::slotted(.cell) {
                position: absolute;
                will-change: transform;
                transition: transform 0.5s;
            }
        `
    ];

    render() {
        const { _itemWidth: w, itemHeight: h } = this;
        return html`
            <div class="content" style="position: relative; height: ${this._canvasHeight}px">
                ${this._elements.map(({ x, y, data }) =>
                    guard([x, y, data], () => {
                        return data !== null
                            ? html`
                                  <div
                                      class="cell"
                                      style="position: absolute; will-change: transform; width: ${w}px; height: ${h}px; transform: translate3d(${x}px, ${y}px, 0)"
                                  >
                                      ${this.renderItem(data)}
                                  </div>
                              `
                            : html``;
                    })
                )}
            </div>
        `;
    }
}

@element("virtual-list-test")
export class VirtualListTest extends BaseElement {
    data: { i: number }[] = [];

    constructor() {
        super();
        for (let i = 0; i < 10000; i++) {
            this.data.push({ i });
        }
    }

    static styles = [
        css`
            pl-virtual-list {
                ${mixins.fullbleed()}
                overflow-y: auto;
            }

            .item {
                border: solid 1px;
                margin: 5px;
                text-align: center;
                line-height: 90px;
            }
        `
    ];

    render() {
        return html`
            <pl-virtual-list
                .data=${this.data}
                .minItemWidth=${200}
                .itemHeight=${100}
                .renderItem=${(item: { i: number }) =>
                    html`
                        <div class="item">${item.i}</div>
                    `}
            ></pl-virtual-list>
        `;
    }
}
