import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Landing } from '@/screens/Landing'
import { MapScreen } from '@/screens/MapScreen'
import { FamilyCircle } from '@/screens/FamilyCircle'
import { Checklist } from '@/screens/Checklist'
import { NotFound } from '@/screens/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="/family" element={<FamilyCircle />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
