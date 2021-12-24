import type { Canvas, Image, NodeCanvasRenderingContext2D } from 'canvas';

export interface CanvasGridProps {
    /** Canvas | HTMLCanvasElement */
    canvas: Canvas | HTMLCanvasElement;
    /** canvas background color */
    bgColor?: string;
    /** cell width */
    width?: number;
    /** cell height */
    height?: number;
    /** grid's padding default 10 */
    padding?: number | number[];
    /** a way of alignment each box along the appropriate axis,like css 'align-items',default 'center' */
    alignItems?: 'center' | 'start' | 'end';
    /** a way of justifying each box along the appropriate axis,like css 'justify-items',default 'center' */
    justifyItems?: 'center' | 'start' | 'end';
    /** image list */
    list: ItemConfig[];
    /** gap between each cell,default 10 */
    gap?: number | [number, number];
    /** column number default 3 */
    col?: number;
    /** 
     * columns's width type,default 'max'
     * 
     * 'max': all columns's width will be the same(cell's max width).
     * 
     * 'min': each columns's width will be the max of columns's cell.
     * 
     * 'auto': if colSpan > 1 ,the cell colSpan columns's width will be the same.
     * 
     * 'fixed': if CanvasGridProps['width'] set,all columns's width will be CanvasGridProps['width'],else the same as 'max'.
     */
    widthType?: 'max' | 'min' | 'auto' | 'fixed';
    /** cell's height type,default 'auto' */
    heightType?: 'max' | 'min' | 'auto' | 'fixed';
    /** 
     * image draw type,like css 'object-fit' default:'contain'
     * 
     * 'auto': if image overflow the cell,will be the same as 'contain'
     */
    objectFit?: 'auto' | 'contain' | 'fill' | 'cover';
}

export type ItemConfig = {
    /** colSpan of this cell */
    colSpan?: number;
    /** rowSpan of this cell */
    rowSpan?: number;
    /** cell's image */
    image?: Image | Canvas;
} & Pick<CanvasGridProps, 'width' | 'height' | 'alignItems' | 'justifyItems' | 'objectFit'>

interface Template extends ItemConfig {
    realWidth: number;
    realHeight: number;
    /** 最大绘图宽度 */
    maxWidth: number;
    /** 最大绘图高度 */
    maxHeight: number;
    colSpan: number;
    rowSpan: number;
    alignItems: 'center' | 'start' | 'end';
    justifyItems: 'center' | 'start' | 'end';
    objectFit?: 'auto' | 'contain' | 'fill' | 'cover';
}

class CanvasGrid {
    itemWidth?: number;
    itemHeight?: number;
    left: number;
    top: number;
    bottom: number;
    right: number;
    gap: [number, number];
    alignItems: 'center' | 'start' | 'end';
    justifyItems: 'center' | 'start' | 'end';
    list: CanvasGridProps['list'];
    col: number;
    canvas: Canvas;
    ctx: NodeCanvasRenderingContext2D;
    template: Template[][] = [];
    colTemplate: Template[][] = [];
    bgColor?: string;
    colWidths: number[] = [];
    rowHeights: number[] = [];
    widthType: 'max' | 'min' | 'auto' | 'fixed';
    heightType: 'max' | 'min' | 'auto' | 'fixed';
    objectFit: 'auto' | 'contain' | 'fill' | 'cover';

    constructor(props: CanvasGridProps) {
        const { width, height, padding, alignItems, justifyItems, list, col, canvas, gap, bgColor, widthType, heightType, objectFit } = props;
        this.itemWidth = width;
        this.itemHeight = height;
        const _padding = handlePadding(padding);
        this.top = _padding[0];
        this.right = _padding[1];
        this.bottom = _padding[2];
        this.left = _padding[3];
        this.alignItems = alignItems || 'center';
        this.justifyItems = justifyItems || 'center';
        this.list = list || [];
        this.col = col || 3;
        this.canvas = canvas as Canvas;
        this.ctx = this.canvas.getContext('2d');
        this.bgColor = bgColor;
        this.widthType = widthType || 'max';
        if (this.widthType === 'fixed' && width == null) {
            this.widthType = 'max';
        }
        this.heightType = heightType || 'auto';
        if (this.heightType === 'fixed' && height == null) {
            this.heightType = 'max';
        }
        this.objectFit = objectFit || 'contain';

        this.gap = handleGap(gap);

        this.initTemplate();
        this.render();
    }

    //计算布局状态
    private initTemplate() {
        const { list, itemHeight, itemWidth, col, gap } = this;
        const template: Template[][] = [];
        let rowIndex = 0;
        let colIndex = 0;
        for (let i = 0, l = list.length; i < l; i++) {
            const item = list[i];
            if (template[rowIndex]?.[colIndex]) {
                colIndex++;
                if (colIndex >= col) {
                    colIndex = 0;
                    rowIndex++;
                }
                i--;
                continue;
            };
            const row: Template[] = template[rowIndex] || [];
            const colSpan = item.colSpan ?? 1;
            const rowSpan = item.rowSpan ?? 1;

            const imgWidth = item.image?.width;
            const imgHeight = item.image?.height;

            const realWidth = item.width ?? (imgWidth || itemWidth || 0);
            const realHeight = item.height ?? (imgHeight || itemHeight || 0);

            const width = (realWidth - (colSpan - 1) * gap[1]) / (colSpan || 1);//当前单元格的单位width，非最终，最终以该列最大的为主
            const height = (realHeight - (rowSpan - 1) * gap[0]) / (rowSpan || 1);//当前单元格的单位height，非最终

            const rowItem: Template = {
                ...item,
                colSpan,
                rowSpan,
                width: (typeof itemWidth === 'number' && width < itemWidth) ? itemWidth : width,
                height: (typeof itemHeight === 'number' && height < itemHeight) ? itemHeight : height,
                realWidth,
                realHeight,
                maxWidth: 0,
                maxHeight: 0,
                justifyItems: item.justifyItems || this.justifyItems,
                alignItems: item.alignItems || this.alignItems,
                objectFit: item.objectFit || this.objectFit,
            };

            row[colIndex] = rowItem;
            template[rowIndex] = row;

            const maxSpan = Math.min(colSpan, col - colIndex);
            for (let k = 0; k < rowSpan; k++) {
                const row = template[rowIndex + k] || [];
                for (let j = 0; j < maxSpan; j++) {
                    row[colIndex + j] = row[colIndex + j] || this.getEmpty(rowItem.width || 0, rowItem.height || 0);
                }
                template[rowIndex + k] = row;
            }
            colIndex += colSpan;
            if (colIndex >= col) {
                colIndex = 0;
                rowIndex++;
            }
        }
        this.template = template;
        this.colTemplate = this.getColTemplate();
        this.setFitWH();
    }

    render() {
        this.setSsize();
        const { ctx, bgColor, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bgColor) {
            ctx.save();
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        this.renderGrid();
    }

    /** 追加数据 */
    appendData(list: CanvasGridProps['list']) {
        this.list = this.list.concat(list);
        this.initTemplate();
        this.render();
    }

    private renderGrid() {
        const { colWidths, rowHeights, left, top, ctx, template, gap } = this;
        ctx.save();
        ctx.translate(left, top);
        for (let rowIndex = 0, l = template.length, y = 0; rowIndex < l; rowIndex++) {
            const row = template[rowIndex];
            ctx.save();
            ctx.translate(0, y);
            const rowHeight = rowHeights[rowIndex];
            for (let colIndex = 0, _l = row.length, x = 0; colIndex < _l; colIndex++) {
                const { image, realWidth, realHeight, justifyItems, alignItems, maxWidth, maxHeight, objectFit } = row[colIndex] || {};
                const colWidth = colWidths[colIndex];
                if (image && maxWidth && maxHeight && realHeight && realWidth) {
                    let dx = realWidth;
                    let dy = realHeight;
                    let left = 0, top = 0;
                    if (objectFit === 'contain') {
                        const scale = Math.max(realWidth / maxWidth, realHeight / maxHeight);
                        dx = realWidth / scale;
                        dy = realHeight / scale;
                    } else if (objectFit === 'fill') {
                        dx = maxWidth;
                        dy = maxHeight;
                    } else if (objectFit === 'auto') {
                        const scale = Math.max(realWidth / maxWidth, realHeight / maxHeight);
                        if (scale > 1) {
                            dx = realWidth / scale;
                            dy = realHeight / scale;
                        }
                    }

                    if (justifyItems === 'center') {
                        left = (maxWidth - dx) * 0.5;
                    } else if (justifyItems === 'end') {
                        left = maxWidth - dx;
                    }

                    if (alignItems === 'center') {
                        top = (maxHeight - dy) * 0.5;
                    } else if (alignItems === 'end') {
                        top = maxHeight - dy;
                    }
                    ctx.save();
                    ctx.translate(x, 0);
                    ctx.drawImage(image, left, top, dx, dy);
                    // ctx.drawImage(image, 0, 0, realWidth, realHeight, left, top, dx, dy);
                    ctx.restore();

                }
                x += colWidth + gap[1];
            }
            ctx.restore();
            y += rowHeight + gap[0];
        }
        ctx.restore();
    }

    /** 设置canvas大小 */
    private setSsize() {
        const { gap, colWidths, rowHeights } = this;
        const gapWidth = gap[1] * (colWidths.length - 1);
        const gapHeight = gap[0] * (rowHeights.length - 1);
        const contentWidth = colWidths.reduce((a, b) => a + b);
        const contentHeight = rowHeights.reduce((a, b) => a + b);
        this.canvas.width = gapWidth + contentWidth + gap[1] * 2;
        this.canvas.height = gapHeight + contentHeight + gap[0] * 2;
    }

    //确定行列宽高
    private setFitWH() {
        const { template, colTemplate, gap, col, widthType, heightType, itemWidth, itemHeight } = this;
        const colWidths: number[] = [];
        const rowHeights: number[] = [];
        for (const row of colTemplate) {
            const maxWidth = Math.max(...row.map(v => v?.width || 0).filter(v => typeof v === 'number'));
            colWidths.push(maxWidth);
        }
        for (const row of template) {
            const maxHeight = Math.max(...row.map(v => v?.height || 0).filter(v => typeof v === 'number'));
            rowHeights.push(maxHeight);
        }
        if (widthType === 'max') {
            const max = Math.max(...colWidths);
            colWidths.fill(max, 0, colWidths.length);
        } else if (widthType === 'auto') {
            for (let rowIndex = 0, l = template.length; rowIndex < l; rowIndex++) {
                const row = template[rowIndex];
                for (let colIndex = 0, l = row.length; colIndex < l; colIndex++) {
                    const item = row[colIndex];
                    if (!item) continue;
                    const { colSpan } = item;
                    if (colSpan >= 2) {
                        const max = Math.max(...colWidths.slice(colIndex, colIndex + colSpan));
                        colWidths.fill(max, colIndex, colIndex + colSpan);
                    }
                }
            }
        } else if (widthType === 'fixed' && typeof itemWidth === 'number') {
            colWidths.fill(itemWidth, 0, colWidths.length);
        }


        if (heightType === 'max') {
            const max = Math.max(...rowHeights);
            rowHeights.fill(max, 0, rowHeights.length);
        } else if (heightType === 'auto') {
            for (let rowIndex = 0, l = colTemplate.length; rowIndex < l; rowIndex++) {
                const row = colTemplate[rowIndex];
                for (let colIndex = 0, l = row.length; colIndex < l; colIndex++) {
                    const item = row[colIndex];
                    if (!item) continue;
                    const { rowSpan } = item;
                    if (rowSpan >= 2) {
                        const max = Math.max(...rowHeights.slice(colIndex, colIndex + rowSpan));
                        rowHeights.fill(max, colIndex, colIndex + rowSpan);
                    }
                }
            }
        } else if (heightType === 'fixed' && typeof itemHeight === 'number') {
            rowHeights.fill(itemHeight, 0, rowHeights.length);
        }

        //生成当前图形的最大绘图宽高
        for (let rowIndex = 0, l = template.length; rowIndex < l; rowIndex++) {
            const row = template[rowIndex];
            for (let colIndex = 0, l = row.length; colIndex < l; colIndex++) {
                const item = row[colIndex];
                if (!item) continue;
                const { rowSpan, colSpan } = item;
                if (rowSpan && colSpan) {
                    const gapWidth = (rowSpan - 1) * gap[0];
                    const gapHeight = (colSpan - 1) * gap[1];
                    let colSpanWidth = 0;
                    const maxSpan = Math.min(colSpan, col - colIndex);
                    for (let i = 0; i < maxSpan; i++) {
                        colSpanWidth += colWidths[colIndex + i];
                    }

                    let rowSpanWidth = 0;
                    for (let i = 0; i < rowSpan; i++) {
                        rowSpanWidth += rowHeights[rowIndex + i];
                    }
                    item.maxWidth = gapWidth + colSpanWidth;
                    item.maxHeight = gapHeight + rowSpanWidth;
                }
            }

        }
        this.colWidths = colWidths;
        this.rowHeights = rowHeights;
    }

    //行列变换
    private getColTemplate() {
        const { template } = this;
        const list: Template[][] = [];
        const realCol = template?.[0]?.length || 0;
        for (let colIndex = 0; colIndex < realCol; colIndex++) {
            const row: Template[] = [];
            for (let j = 0, l = template.length; j < l; j++) {
                const item = template[j][colIndex];
                item && row.push(item);
            }
            list.push(row);
        }
        return list;
    }

    private getEmpty(width: number, height: number): Template {
        return {
            width,
            height,
            justifyItems: 'center',
            alignItems: 'center',
            rowSpan: 0,
            colSpan: 0,
            realHeight: 0,
            realWidth: 0,
            maxWidth: 0,
            maxHeight: 0,
        };
    }
}

export default CanvasGrid;

function handlePadding(padding?: number[] | number): [number, number, number, number] {
    if (typeof padding === 'number') {
        return [padding, padding, padding, padding];
    } else if (padding instanceof Array && padding.length) {
        return [...padding, ...padding, ...padding, ...padding].slice(0, 4) as any;
    }
    return [10, 10, 10, 10];
}

function handleGap(gap?: number | [number, number]): [number, number] {
    if (gap instanceof Array && gap.length >= 2) {
        return gap;
    } else if (typeof gap === 'number') {
        return [gap, gap]
    }
    return [10, 10];
}
