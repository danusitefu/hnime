const axios = require('axios')
const morgan = require('morgan')
const express = require('express')
const PDFDocument = require('pdfkit')

function toPDF(images, opt = {}) {
	return new Promise(async (resolve, reject) => {
		if (!Array.isArray(images)) images = [images]
		let buffs = [], doc = new PDFDocument({ margin: 0, size: 'A4' })
		for (let x = 0; x < images.length; x++) {
			if (/.webp|.gif/.test(images[x])) continue
			let data = (await axios.get(images[x], { responseType: 'arraybuffer', ...opt })).data
			doc.image(data, 0, 0, { fit: [595.28, 841.89], align: 'center', valign: 'center' })
			if (images.length != x + 1) doc.addPage()
		}
		doc.on('data', (chunk) => buffs.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(buffs)))
		doc.on('error', (err) => reject(err))
		doc.end()
	})
}

let baseUrl = 'https://cin.guru/'

async function nh(id) {
	let uri = id ? baseUrl + `v/${+id}/` : baseUrl
	let html = (await axios.get(uri)).data
	return JSON.parse(html.split('<script id="__NEXT_DATA__" type="application/json">')[1].split('</script>')[0]).props.pageProps.data
}
async function getID(id){
	return new Promise(async (resolve, reject) => {
        try {
            await nh(id)
            .then(async(data) =>{
            let pages = []
            let thumb = `https://external-content.duckduckgo.com/iu/?u=https://t.nhentai.net/galleries/${data.media_id}/thumb.jpg`	
            data.images.pages.map((v, i) => {
                let ext = new URL(v.t).pathname.split('.')[1]
                pages.push(`https://external-content.duckduckgo.com/iu/?u=https://i7.nhentai.net/galleries/${data.media_id}/${i + 1}.${ext}`)
                })
                let tags = data.tags
                let tag1 = []
                for(let i = 0; i < tags.length; i++) {
                    let item = tags[i];
                    if (item.type == 'tag') {
                        tag1[i] = item.name
                    };
                };
                let tag = tag1.filter(x => x != undefined) 
                let art = []
                for(let i = 0; i < tags.length; i++) {
                    let item = tags[i];
                    if (item.type == 'artist') {
                        art[i] = item.name
                    };
                };
                let artist = art.filter(x => x != undefined) 
                let lang = []
                for(let i = 0; i < tags.length; i++) {
                    let item = tags[i];
                    if (item.type == 'language') {
                        lang[i] = item.name
                    };
                };
                let language = lang.filter(x => x != undefined)
                let cat = []
                for(let i = 0; i < tags.length; i++) {
                    let item = tags[i];
                    if (item.type == 'category') {
                        cat[i] = item.name
                    };
                };
                let category = cat.filter(x => x != undefined)  
            resolve({
                id: data.id,
                title: data.title,
                thumb,
                pages,
                tag,
                artist,
                category,
                language, 
                media_id: data.media_id,
                num_pages: pages.length,
                upload_date: data.upload_date
            })
            })
        } catch(err) {
            resolve({message: err.message})
        }
    })
}

const app = express()
	.set('json spaces', 4)
	.use(morgan('dev'))
	.use(express.json())
	.all('/', (_, res) => {
		let baseUrl = `https://${_.get('host')}`
		res.json({
		author: `Mroy25`,
		WA: `081215524272`,
		runtime: new Date(process.uptime() * 1000).toTimeString().split(' ')[0],
		endpoint: {
			detail: `${baseUrl}/detail?code=212121`,
			read: `${baseUrl}/read?code=212121`,
			pdf: `${baseUrl}/pdf?code=212121`,
		},
	})
})
	.get('/detail', async (req, res) => {
		let q = req.query.code
		if (!q) return res.json({ message: 'Input parameter code' })
		try {
			let result = await getID(q)
			res.send(result)
			//res.redirect(await result.download())
		} catch (e) {
			console.log(e)
			res.json({ message: e })
		}
	})
	.get('/read', async (req, res) => {
		let q = req.query.code
		if (!q) return res.json({ message: 'Input parameter code' })
	try {
		let result = await getID(q)
		let restjson = result.pages
		let title = result.title.english
		let duckJson = await restjson.map(a => 'https://external-content.duckduckgo.com/iu/?u=' + a)
		let html = `<!DOCTYPE html>
		<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${title}</title>
		<style>
		img {
			display: block;
			margin-left: auto;
			margin-right: auto;
			width: 100%;
		}
		body {
			background-color: #1a202c;
			background-color: rgba(26, 32, 44, 1);
		}
		@media (min-width: 576px) {
			img {
				width: auto;
				max-width: 100%;
				height: auto;
			}
		}
		</style>
		</head>
		<body>`
		for(let url of duckJson) html += `<img src=${url}>`
			res.send(html)	
	} catch(err) {
		   res.json({ error: err.message }) 
		 }
	})
	.get('/pdf', async (req, res) => {
		let q = req.query.code
		if (!q) return res.json({ message: 'Input parameter code' })
		try {
			let result = await getID(q)
			let bufft = await toPDF(result.pages)
			const buffer = Buffer.from(bufft, "base64");
			res.send(buffer)
		} catch (e) {
			console.log(e)
			res.json({ message: e })
		}
	})
	.listen(5000, () => console.log('App running on port 5000'))
