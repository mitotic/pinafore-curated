import CurateHomeDialog from '../components/CurateHomeDialog.html'
import { showDialog } from './showDialog.js'

export default function showCurateHomeDialog (homeInfo) {
  return showDialog(CurateHomeDialog, {
    label: 'Curation Info',
    title: 'Curation Info',
    homeInfo
  })
}
