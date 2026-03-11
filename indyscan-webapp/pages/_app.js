import React from 'react'
import App from 'next/app'
import { CSSTransition } from 'react-transition-group'
import '../styles/globals.css'
import '../scss/style.scss'
// Next 13: first-party global CSS must be imported from _app
import '../components/BadgedValueDisplay/BadgedValueDisplay.scss'
import '../components/MenuLink/MenuLink.scss'
import '../components/Navbar/Navbar.scss'
import '../components/NetworkInfo/NetworkInfo.scss'
import '../components/PageHeader/PageHeader.scss'
import '../components/SubledgerHeader/SubledgerHeader.scss'
import '../components/TxDisplay/TxDisplay.scss'
import '../components/TxListItem/TxListItem.scss'
import '../components/TxListCompact/TxListCompact.scss'
import '../components/TxPreview/TxPreview.scss'
import '../components/TxPreviewList/TxPreviewList.scss'

export default class MyApp extends App {
  static async getInitialProps ({ Component, router, ctx }) {
    let pageProps = {}
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }
    return { pageProps }
  }

  render () {
    const { Component, pageProps } = this.props
    const { ledger, network } = pageProps
    return (
      <div className="min-h-screen bg-background">
        <title>HL Indy Tx Explorer</title>
        <div className="container mx-auto px-4">
          <CSSTransition key={JSON.stringify({ ledger, network })} appear={true} in={true} timeout={300}
                         classNames="pageanimation">
            <Component {...pageProps} />
          </CSSTransition>
        </div>
      </div>
    )
  }
}
