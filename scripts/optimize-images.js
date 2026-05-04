import imagemin from 'imagemin';
import mozjpeg from 'imagemin-mozjpeg';
import pngquant from 'imagemin-pngquant';
import path from 'path';

async function run() {
  const input = path.join(process.cwd(), 'assets', 'images', '*.{png,jpg,jpeg}');
  console.log('Optimizing images in', input);
  const files = await imagemin([input], {
    destination: path.join(process.cwd(), 'assets', 'images'),
    plugins: [
      pngquant({ quality: [0.6, 0.8] }),
      mozjpeg({ quality: 75 })
    ]
  });
  console.log('Optimized', files.length, 'images');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
