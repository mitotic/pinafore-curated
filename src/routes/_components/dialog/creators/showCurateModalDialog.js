import CurateModalDialog from '../components/CurateModalDialog.html'
import { showDialog } from './showDialog.js'

export default function showCurateModalDialog (curateInfo) {
  return showDialog(CurateModalDialog, {
    label: 'Curation Modal',
    title: 'Curation Info',
    curateInfo
  })
}
