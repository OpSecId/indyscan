import React, { Component } from 'react'
import { getNetwork, getTxs } from 'indyscan-api-client'
import { getBaseUrl, getBaseUrlForServerFetch } from '../routing'
import PageHeader from '../components/PageHeader/PageHeader'
import TxPreviewList from '../components/TxPreviewList/TxPreviewList'
import Footer from '../components/Footer/Footer'
import fetch from 'isomorphic-fetch'
import _ from 'lodash'
import { CSSTransition } from 'react-transition-group'
import { assureWebsocketClient, getWebsocketClient } from '../context/socket-client'
import NetworkInfo from '../components/NetworkInfo/NetworkInfo'
import SubledgerHeader from '../components/SubledgerHeader/SubledgerHeader'
import { SOCKETIO_EVENT } from '../sockets/constants'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

class HomePage extends Component {
  static async getInitialProps ({ req, query }) {
    const baseUrl = getBaseUrl(req)
    const fetchBase = getBaseUrlForServerFetch(req) || baseUrl
    const { network } = query
    const featuresRes = await fetch(`${fetchBase}/features`)
    const features = (await featuresRes.json())
    const versionRes = await fetch(`${fetchBase}/version`)
    const version = (await versionRes.json()).version
    const networkDetails = await getNetwork(fetchBase, network)
    const [domainTxsRaw, poolTxsRaw, configTxsRaw] = await Promise.all([
      getTxs(fetchBase, network, 'domain', 0, 13, [], 'serialized'),
      getTxs(fetchBase, network, 'pool', 0, 13, [], 'serialized'),
      getTxs(fetchBase, network, 'config', 0, 13, [], 'serialized')
    ])
    const domainTxs = Array.isArray(domainTxsRaw) ? domainTxsRaw : []
    const poolTxs = Array.isArray(poolTxsRaw) ? poolTxsRaw : []
    const configTxs = Array.isArray(configTxsRaw) ? configTxsRaw : []
    return {
      features,
      networkDetails,
      network,
      domainTxs,
      poolTxs,
      configTxs,
      baseUrl,
      version
    }
  }

  constructor (props) {
    super()
    this.state = {
      domainTxs: Array.isArray(props.domainTxs) ? props.domainTxs : [],
      poolTxs: Array.isArray(props.poolTxs) ? props.poolTxs : [],
      configTxs: Array.isArray(props.configTxs) ? props.configTxs : []
    }
  }

  addNewDomainTx (txData) {
    let domainTxs = _.cloneDeep(this.state.domainTxs)
    if (domainTxs.length > 0 && domainTxs[0] && domainTxs[0].imeta && domainTxs[0].imeta.seqNo === txData.imeta.seqNo) {
      // When scanner runs too fast (it might happen that one transaction in daemon is processed twice, causing
      // duplicate notification about the same transaction from UI perspective. If we'd add this transaction,
      // we bump into problem with animations, because 2 transactions in list would have generated the same
      // key (as that is derived from seqNo and subledger).
      // This early return is preventing this from happening
      return
    }
    domainTxs.unshift(txData)
    if (domainTxs.length > 10) {
      domainTxs.pop()
    }
    this.setState({ domainTxs })
  }

  addNewConfigTx (txData) {
    let configTxs = _.cloneDeep(this.state.configTxs)
    if (configTxs.length > 0 && configTxs[0] && configTxs[0].imeta && configTxs[0].imeta.seqNo === txData.imeta.seqNo) {
      return
    }
    configTxs.unshift(txData)
    if (configTxs.length > 10) {
      configTxs.pop()
    }
    this.setState({ configTxs })
  }

  addNewPoolTx (txData) {
    let poolTxs = _.cloneDeep(this.state.poolTxs)
    if (poolTxs.length > 0 && poolTxs[0] && poolTxs[0].imeta && poolTxs[0].imeta.seqNo === txData.imeta.seqNo) {
      return
    }
    poolTxs.unshift(txData)
    if (poolTxs.length > 10) {
      poolTxs.pop()
    }
    this.setState({ poolTxs })
  }

  onTxDiscovered (payload) {
    this.setState({ animateFirst: true })
    // const {workerData, txData} = payload
    const { txData } = payload
    console.log(`onTxDiscovered >>> ${JSON.stringify(txData)}`)
    if (txData.imeta.subledger === 'domain') {
      this.addNewDomainTx(txData)
    }
    if (txData.imeta.subledger === 'pool') {
      this.addNewPoolTx(txData)
    }
    if (txData.imeta.subledger === 'config') {
      this.addNewConfigTx(txData)
    }
  }

  onRescanScheduled (payload) {
    const { workerData: { subledger }, msTillRescan } = payload
    const rescanStart = Math.round((new Date()).getTime())
    const rescanDone = rescanStart + Math.round(msTillRescan)
    if (subledger === 'domain') {
      this.setState({ domainRescanStart: rescanStart, domainRescanDone: rescanDone })
    }
    if (subledger === 'pool') {
      this.setState({ poolRescanStart: rescanStart, poolRescanDone: rescanDone })
    }
    if (subledger === 'config') {
      this.setState({ configRescanStart: rescanStart, configRescanDone: rescanDone })
    }
  }

  getPercentage (rescanStart, rescanDone) {
    const now = Math.round((new Date()).getTime())
    const totalDuration = rescanDone - rescanStart
    const timePassed = now - rescanStart
    return (timePassed / totalDuration) * 100
  }

  recalcProgress () {
    const { domainRescanStart, domainRescanDone } = this.state
    const { poolRescanStart, poolRescanDone } = this.state
    const { configRescanStart, configRescanDone } = this.state
    this.setState({ scanProgressDomain: this.getPercentage(domainRescanStart, domainRescanDone) })
    this.setState({ scanProgressPool: this.getPercentage(poolRescanStart, poolRescanDone) })
    this.setState({ scanProgressConfig: this.getPercentage(configRescanStart, configRescanDone) })
  }

  componentWillReceiveProps (newProps) {
    console.log(`componentWillReceiveProps`)
    this.setState({ domainTxs: Array.isArray(newProps.domainTxs) ? newProps.domainTxs : [] })
    this.setState({ poolTxs: Array.isArray(newProps.poolTxs) ? newProps.poolTxs : [] })
    this.setState({ configTxs: Array.isArray(newProps.configTxs) ? newProps.configTxs : [] })
    this.setState({ animateFirst: false })
  }

  configureSocketForCurrentNetwork(networkDetails) {
    if (networkDetails) {
      const { id: indyNetworkId } = networkDetails
      if (indyNetworkId) {
        let socket = assureWebsocketClient()
        socket.on('connection', function (_socket) {
          logger.info(`app.js WS connection established.`)
        })
        socket.on('switched-room-notification', (activeWsRoom) => {
          console.log(`switched-room-notification: Entered room ${activeWsRoom}`)
          this.setState({activeWsRoom})
          socket.on(SOCKETIO_EVENT.LEDGER_TX_SCAN_SCHEDULED, this.onRescanScheduled.bind(this))
          socket.on(SOCKETIO_EVENT.LEDGER_TX_SCANNED, this.onTxDiscovered.bind(this))
        })
        console.log(`Sending switch-room request for ${indyNetworkId}`)
        socket.emit('switch-room', indyNetworkId)
      }
    }
  }

  componentDidMount () {
    const { networkDetails, features } = this.props
    if (features.websockets === true) {
      this.configureSocketForCurrentNetwork(networkDetails)
    } else {
      console.log("Feature websockets is not enabled.")
    }
    this.interval = setInterval(this.recalcProgress.bind(this), 350)
  }

  componentWillUnmount () {
    console.log(`componentWillUnmount`)
    clearInterval(this.interval)
    const socket = getWebsocketClient()
    if (socket) {
      console.log(`Cleaning socket listeners. Had listeners=${socket.hasListeners()}`)
      socket.off(SOCKETIO_EVENT.LEDGER_TX_SCANNED)
      socket.off(SOCKETIO_EVENT.LEDGER_TX_SCAN_SCHEDULED)
      socket.off('switched-room-notification')
    }
  }

  render () {
    const { network, networkDetails, baseUrl } = this.props
    const { domainTxs, poolTxs, configTxs } = this.state
    const { scanProgressDomain, scanProgressPool, scanProgressConfig } = this.state
    const isInteractive = (!!this.state.activeWsRoom)
    return (
      <div>
        <header className="border-b border-border pb-6 mb-6">
          <div className="container mx-auto px-4">
            <PageHeader page='home' network={network} baseUrl={baseUrl}/>
          </div>
        </header>
        <div className="container mx-auto px-4">
          <NetworkInfo networkDetails={networkDetails}/>
        </div>
        <CSSTransition key={network} appear={true} in={true} timeout={300}
                       classNames="txsanimation">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 container mx-auto px-4 mt-8 pb-8">
            <Card>
              <CardHeader className="pb-2">
                <SubledgerHeader isInteractive={isInteractive} subledger='Domain' progress={scanProgressDomain}/>
              </CardHeader>
              <CardContent className="pt-2">
                <TxPreviewList animateFirst={this.state.animateFirst} indyscanTxs={domainTxs}
                               network={network} subledger='domain'/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <SubledgerHeader isInteractive={isInteractive} subledger='Pool' progress={scanProgressPool}/>
              </CardHeader>
              <CardContent className="pt-2">
                <TxPreviewList animateFirst={this.state.animateFirst} indyscanTxs={poolTxs}
                               network={network} subledger='pool'/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <SubledgerHeader isInteractive={isInteractive} subledger='Config' progress={scanProgressConfig}/>
              </CardHeader>
              <CardContent className="pt-2">
                <TxPreviewList animateFirst={this.state.animateFirst} indyscanTxs={configTxs}
                               network={network} subledger='config'/>
              </CardContent>
            </Card>
          </div>
        </CSSTransition>
        <div className="container mx-auto px-4 pb-8">
          <Footer displayVersion={this.props.version}/>
        </div>
      </div>
    )
  }
}

export default HomePage
