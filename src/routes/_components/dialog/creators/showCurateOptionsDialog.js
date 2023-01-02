import CurateOptionsDialog from '../components/CurateOptionsDialog.html'
import { showDialog } from './showDialog.js'

export default function showCurateOptionsDialog (curateInfo) {
  return showDialog(CurateOptionsDialog, {
    label: 'Curation Options',
    title: 'Curation Info',
    curateInfo
  })
}
