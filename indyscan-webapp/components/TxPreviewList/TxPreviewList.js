import TxPreview from '../TxPreview/TxPreview'
import { extractTxDataBasic } from '../../txtools'
import { ItemGroup } from 'semantic-ui-react'
import React, { Component } from 'react'
import { CSSTransition } from 'react-transition-group'

class TxPreviewList extends Component {

  //https://reactjs.org/docs/react-component.html#shouldcomponentupdate
  shouldComponentUpdate (nextProps) {
    const previousTxs = this.props.indyscanTxs
    const nextTxs = nextProps.indyscanTxs
    if (previousTxs && nextTxs && previousTxs[0] && nextTxs[0] && previousTxs[0].imeta && nextTxs[0].imeta) {
      return (previousTxs[0].imeta.seqNo !== nextTxs[0].imeta.seqNo)
    }
    return true
  }

  render () {
    const { indyscanTxs, network, subledger, animateFirst } = this.props
    const safeTxs = Array.isArray(indyscanTxs) ? indyscanTxs.filter(tx => tx && tx.imeta) : []
    if (safeTxs.length === 0) {
      return (
        <ItemGroup>
          <TxPreview key={`preview-${network}-${subledger}-empty`}
                     seqNo={null}
                     txnTimeIso8601={null}
                     typeName="No transactions yet"
                     from={null}
                     network={network}
                     ledger={subledger}/>
        </ItemGroup>
      )
    }
    const { seqNo, txnTimeIso8601, typeName, from } = extractTxDataBasic(safeTxs[0])
    return (
      <ItemGroup>
        {seqNo &&
          <CSSTransition key={seqNo} appear={animateFirst} in={true} timeout={1000} classNames="txitem">
            <TxPreview key={`preview-${network}-${subledger}-xyz`}
                       seqNo={seqNo}
                       txnTimeIso8601={txnTimeIso8601}
                       typeName={typeName}
                       from={from}
                       network={network}
                       ledger={subledger}/>
          </CSSTransition>
        }
        {
          safeTxs.slice(1).map((indyscanTx, index) => {
            const { seqNo, txnTimeIso8601, typeName, from } = extractTxDataBasic(indyscanTx)
            return (
              <TxPreview key={`preview-${network}-${subledger}-${seqNo}`}
                         seqNo={seqNo}
                         txnTimeIso8601={txnTimeIso8601}
                         typeName={typeName}
                         from={from}
                         network={network}
                         ledger={subledger}/>
            )
          })
        }
      </ItemGroup>
    )
  }
}

export default TxPreviewList
