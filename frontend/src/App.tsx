import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Landing } from '@/screens/Landing'

// Лендинг — в основном чанке (быстрый первый экран), остальное — лениво.
const MapScreen = lazy(() => import('@/screens/MapScreen').then((m) => ({ default: m.MapScreen })))
const Houses = lazy(() => import('@/screens/Houses').then((m) => ({ default: m.Houses })))
const FamilyCircle = lazy(() => import('@/screens/FamilyCircle').then((m) => ({ default: m.FamilyCircle })))
const Checklist = lazy(() => import('@/screens/Checklist').then((m) => ({ default: m.Checklist })))
const Drill = lazy(() => import('@/screens/Drill').then((m) => ({ default: m.Drill })))
const Login = lazy(() => import('@/screens/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('@/screens/Register').then((m) => ({ default: m.Register })))
const DevPanel = lazy(() => import('@/screens/DevPanel').then((m) => ({ default: m.DevPanel })))
const NotFound = lazy(() => import('@/screens/NotFound').then((m) => ({ default: m.NotFound })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="/houses" element={<Houses />} />
        <Route path="/family" element={<FamilyCircle />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/drill" element={<Drill />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dev" element={<DevPanel />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
