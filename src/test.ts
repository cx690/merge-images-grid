import CanvasGrid, { ItemConfig } from ".";
import { Canvas } from 'canvas';
import pkg from 'canvas';
import fs from 'fs';
const { loadImage } = pkg;

const a = await loadImage('a.png');
const b = await loadImage('b.png');
const c = await loadImage('c.png');

const list: ItemConfig[] = [
    {
        colSpan: 2,
        rowSpan: 2,
        image: a
    },
    {
        image: b,
    },
    {
        image: b,
    },
    {
        image: b,
    },
    {
        image: c
    }
]

const merge = new CanvasGrid({
    canvas: new Canvas(2, 2),
    bgColor: '#fff',
    list,
    objectFit: 'contain'
})
const buffer = merge.canvas.toBuffer();
fs.writeFileSync('demo.png', buffer);