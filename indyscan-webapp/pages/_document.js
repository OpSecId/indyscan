import Document, { Head, Main, NextScript } from 'next/document'
import React from 'react'

export default class MyDocument extends Document {
  render () {
    return (
      <html>
      <Head>
        <link rel='icon' href='/favicon.ico'/>
        <link rel='stylesheet'
              href='//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.3.1/semantic.min.css'/>
        <meta property='og:title' content='Indy Transaction Explorer'/>
        <meta property='og:type' content='website'/>
        <meta property='og:url' content='https://indyscan.io'/>
        <meta property='og:image' content='https://indyscan.io/static/indyscan-logo.png'/>
        <meta property='og:description' content='Explore content of Sovrin Indy blockchains'/>
      </Head>
      <body>
      <Main/>
      <NextScript/>
      </body>
      </html>
    )
  }
}
