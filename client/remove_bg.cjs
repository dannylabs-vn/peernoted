const { Jimp } = require('jimp');

async function removeWhite() {
    try {
        console.log('Reading image...');
        const image = await Jimp.read('public/logo.jpg');
        
        console.log('Processing pixels...');
        // Convert all white-ish pixels to transparent
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            
            // If it's mostly white
            if (red > 220 && green > 220 && blue > 220) {
                this.bitmap.data[idx + 3] = 0; // Alpha channel = 0 (transparent)
            }
        });
        
        console.log('Writing image...');
        await image.write('public/logo.png');
        console.log('Background removed successfully!');
    } catch (err) {
        console.error('Error:', err);
    }
}

removeWhite();
