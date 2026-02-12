import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Star, Trash2, MapPin, Wind, Droplets, Thermometer, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Location, WeatherData } from './types/weather'
import './index.css'

function App() {
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<WeatherData | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState<number | null>(null)

    useEffect(() => {
        fetchLocations()
    }, [])

    const fetchLocations = async () => {
        try {
            const response = await fetch('/api/locations')
            const data = await response.json()
            setLocations(data)
        } catch (error) {
            console.error('Failed to fetch locations:', error)
        }
    }

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery) return

        setLoading(true)
        try {
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: searchQuery })
            })

            if (response.ok) {
                setSearchQuery('')
                await fetchLocations()
            } else {
                const err = await response.json()
                alert(err.detail || 'Failed to add location')
            }
        } catch (error) {
            console.error('Error adding location:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteLocation = async (id: number) => {
        if (!confirm('Are you sure you want to remove this location?')) return

        try {
            await fetch('/api/locations/' + id, { method: 'DELETE' })
            if (selectedLocation?.location.id === id) setSelectedLocation(null)
            await fetchLocations()
        } catch (error) {
            console.error('Error deleting location:', error)
        }
    }

    const handleToggleFavorite = async (location: Location) => {
        try {
            await fetch('/api/locations/' + location.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_favorite: !location.is_favorite })
            })
            await fetchLocations()
        } catch (error) {
            console.error('Error updating favorite:', error)
        }
    }

    const handleViewWeather = async (location: Location) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/locations/${location.id}/weather`)
            const data = await response.json()
            setSelectedLocation(data)
        } catch (error) {
            console.error('Error fetching weather:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSyncWeather = async (id: number) => {
        setSyncing(id)
        try {
            const response = await fetch(`/api/locations/${id}/sync`, { method: 'POST' })
            const data = await response.json()
            if (selectedLocation?.location.id === id) {
                setSelectedLocation(data)
            }
            await fetchLocations()
        } catch (error) {
            console.error('Error syncing weather:', error)
        } finally {
            setSyncing(null)
        }
    }

    const getWeatherIcon = (iconCode: string) => {
        return `https://openweathermap.org/img/wn/${iconCode}@4x.png`
    }

    return (
        <div className="container">
            {/* Header Section */}
            <header className="flex justify-between items-end mb-16">
                <div>
                    <h1>WeatherDesk</h1>
                    <p className="subtitle">NYC Integration / Core System</p>
                </div>

                <form onSubmit={handleAddLocation} className="search-container">
                    <input
                        type="text"
                        placeholder="Search city code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="btn-primary" disabled={loading}>
                        Add Location
                    </button>
                </form>
            </header>

            <div className="flex gap-4 grid-layout" style={{ display: 'flex', gap: '3rem' }}>
                {/* Sidebar / Managed Locations */}
                <aside className="sidebar" style={{ width: '300px', flexShrink: 0 }}>
                    <p className="metric-label px-2">Managed Locations</p>
                    <div className="flex flex-col">
                        {locations.length === 0 && (
                            <div className="card text-center text-muted" style={{ borderStyle: 'dashed' }}>
                                System empty.
                            </div>
                        )}
                        {locations.map((loc) => (
                            <div
                                key={loc.id}
                                className={`location-item ${selectedLocation?.location.id === loc.id ? 'active' : ''}`}
                                onClick={() => handleViewWeather(loc)}
                            >
                                <div>
                                    <h3 className="font-bold" style={{ fontSize: '1rem' }}>{loc.display_name}</h3>
                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{loc.country}</p>
                                </div>
                                <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleToggleFavorite(loc)}
                                    >
                                        <Star className={`w-4 h-4 ${loc.is_favorite ? 'fill-current text-black dark:text-white' : ''}`} />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleDeleteLocation(loc.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Dashboard Display */}
                <main style={{ flex: 1 }}>
                    {!selectedLocation ? (
                        <div className="dashboard-main flex items-center justify-center text-center" style={{ minHeight: '400px', display: 'flex' }}>
                            <div>
                                <Calendar className="w-12 h-12 mb-4 mx-auto text-muted" />
                                <h3 className="text-muted">Select location to view system metrics.</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-main">
                            <header className="flex justify-between items-start mb-12" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h2 className="text-4xl font-bold">{selectedLocation.location.display_name}</h2>
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        {selectedLocation.location.latitude.toFixed(4)}, {selectedLocation.location.longitude.toFixed(4)} /
                                        {selectedLocation.last_synced ? ` Last Sync: ${format(new Date(selectedLocation.last_synced), 'HH:mm:ss')}` : ' No Data'}
                                    </p>
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleSyncWeather(selectedLocation.location.id)}
                                    disabled={syncing !== null}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing === selectedLocation.location.id ? 'animate-spin' : ''}`} />
                                    {syncing === selectedLocation.location.id ? 'Syncing...' : 'Refresh'}
                                </button>
                            </header>

                            {!selectedLocation.current ? (
                                <div className="text-center py-20 bg-bg-secondary">
                                    <p className="text-muted mb-6">Local cache empty. Force sync required.</p>
                                    <button className="btn-primary" onClick={() => handleSyncWeather(selectedLocation.location.id)}>Sync Cache</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-12" style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                                        <span className="temp-large">{Math.round(selectedLocation.current.temperature)}°</span>
                                        <div className="flex flex-col">
                                            <p className="font-bold underline uppercase" style={{ letterSpacing: '0.1em' }}>{selectedLocation.current.weather_main}</p>
                                            <p className="text-muted capitalize">{selectedLocation.current.weather_description}</p>
                                        </div>
                                    </div>

                                    <div className="metric-grid">
                                        <div className="metric-item">
                                            <span className="metric-label">Feels Like</span>
                                            <span className="metric-value">{Math.round(selectedLocation.current.feels_like)}°C</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Humidity</span>
                                            <span className="metric-value">{selectedLocation.current.humidity}%</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Wind</span>
                                            <span className="metric-value">{selectedLocation.current.wind_speed} m/s</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Pressure</span>
                                            <span className="metric-value">{selectedLocation.current.pressure} hPa</span>
                                        </div>
                                    </div>

                                    <div className="forecast-container">
                                        <p className="metric-label" style={{ marginBottom: '1rem' }}>5-Day Forecast Projection</p>
                                        <div className="forecast-grid">
                                            {selectedLocation.forecast?.filter((_, i) => i % 8 === 0).map((item) => (
                                                <div key={item.forecast_timestamp} className="forecast-item">
                                                    <p className="forecast-day">{format(new Date(item.forecast_timestamp * 1000), 'EEE')}</p>
                                                    <p className="forecast-temp">{Math.round(item.temperature)}°</p>
                                                    <p className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{item.weather_main}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

export default App
