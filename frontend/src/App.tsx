import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Star, Trash2, MapPin, Wind, Droplets, Thermometer, Calendar, Cloud, CloudRain, Sun, CloudSnow, CloudLightning, ChevronRight } from 'lucide-react'
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

    const getWeatherIcon = (condition: string) => {
        const cond = condition.toLowerCase();
        if (cond.includes('cloud')) return <Cloud className="w-12 h-12" />;
        if (cond.includes('rain')) return <CloudRain className="w-12 h-12" />;
        if (cond.includes('clear') || cond.includes('sun')) return <Sun className="w-12 h-12" />;
        if (cond.includes('snow')) return <CloudSnow className="w-12 h-12" />;
        if (cond.includes('storm') || cond.includes('thunder')) return <CloudLightning className="w-12 h-12" />;
        if (cond.includes('mist') || cond.includes('fog')) return <Wind className="w-12 h-12" />;
        return <Cloud className="w-12 h-12" />;
    };

    const WorldMap = () => (
        <div className="relative w-full overflow-hidden" style={{ height: '300px' }}>
            <svg viewBox="0 0 1000 500" className="w-full h-full opacity-30 filter grayscale">
                {/* Simplified World Outline */}
                <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    d="M100,200 Q150,150 200,180 T300,150 T400,200 T500,180 T600,200 T700,150 T800,200 T900,180 M150,300 Q200,350 300,320 T500,350 T800,300"
                />
                {/* Latitude/Longitude Rules */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="currentColor" strokeWidth="0.2" strokeDasharray="5,5" />
                <line x1="500" y1="0" x2="500" y2="500" stroke="currentColor" strokeWidth="0.2" strokeDasharray="5,5" />

                {locations.map(loc => {
                    const x = ((loc.longitude + 180) / 360) * 1000;
                    const y = ((90 - loc.latitude) / 180) * 500;
                    const isActive = selectedLocation?.location.id === loc.id;
                    return (
                        <g key={loc.id} className="cursor-pointer" onClick={() => handleViewWeather(loc)}>
                            <rect
                                x={x - 4} y={y - 4}
                                width="8" height="8"
                                fill={isActive ? 'black' : 'none'}
                                stroke="black"
                                strokeWidth="1"
                                className="transition-all duration-300"
                            />
                            {isActive && (
                                <g>
                                    <line x1={x} y1="0" x2={x} y2="500" stroke="black" strokeWidth="0.2" />
                                    <line x1="0" y1={y} x2="1000" y2={y} stroke="black" strokeWidth="0.2" />
                                    <text x={x + 10} y={y - 10} fontSize="10" fill="black" className="font-bold">
                                        NODE_{loc.id}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
            <div className="absolute bottom-4 right-4 text-[10px] text-muted uppercase tracking-widest">
                Planetary Reference: WGS84
            </div>
        </div>
    );

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
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-bg-secondary border border-border-primary">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold uppercase" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>{loc.display_name}</h3>
                                        <p className="text-muted" style={{ fontSize: '0.65rem' }}>{loc.latitude.toFixed(2)}N {loc.longitude.toFixed(2)}E</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
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
                                    <ChevronRight className="w-4 h-4 text-muted ml-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Dashboard Display */}
                <main style={{ flex: 1, position: 'relative' }}>
                    {/* Integrated Geospatial Overview */}
                    <div className="card mb-8" style={{ padding: '0.5rem', overflow: 'hidden', background: 'var(--bg-secondary)', borderStyle: 'solid' }}>
                        <p className="metric-label px-2 pt-2">System Geospatial Overview</p>
                        <WorldMap />
                    </div>

                    {!selectedLocation ? (
                        <div className="dashboard-main flex items-center justify-center text-center" style={{ minHeight: '400px', display: 'flex' }}>
                            <div>
                                <Calendar className="w-12 h-12 mb-4 mx-auto text-muted" />
                                <h3 className="text-muted">Select location to view system metrics.</h3>
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Select a node from the registry or map.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-main">
                            <header className="flex justify-between items-start mb-12" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h2 className="text-4xl font-bold">{selectedLocation.location.display_name}</h2>
                                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        NODE ID: {selectedLocation.location.id} / COORDS: {selectedLocation.location.latitude.toFixed(2)}, {selectedLocation.location.longitude.toFixed(2)} /
                                        {selectedLocation.last_synced ? ` Last Sync: ${format(new Date(selectedLocation.last_synced), 'HH:mm:ss')}` : ' No Data'}
                                    </p>
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleSyncWeather(selectedLocation.location.id)}
                                    disabled={syncing !== null}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing === selectedLocation.location.id ? 'animate-spin' : ''}`} />
                                    {syncing === selectedLocation.location.id ? 'SYNCING...' : 'REFRESH'}
                                </button>
                            </header>

                            {!selectedLocation.current ? (
                                <div className="text-center py-20 bg-bg-secondary" style={{ border: '1px dashed var(--border-primary)' }}>
                                    <p className="text-muted mb-6">LOCAL CACHE EMPTY. FORCE SYNC REQUIRED.</p>
                                    <button className="btn-primary" onClick={() => handleSyncWeather(selectedLocation.location.id)}>INITIALIZE SYNC</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-12" style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                                        <div className="flex flex-col items-center">
                                            {getWeatherIcon(selectedLocation.current.weather_main)}
                                            <span className="temp-large mt-4">{Math.round(selectedLocation.current.temperature)}°</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="font-bold underline uppercase" style={{ letterSpacing: '0.2em', fontSize: '1.2rem' }}>{selectedLocation.current.weather_main}</p>
                                            <p className="text-muted capitalize" style={{ fontSize: '1rem' }}>{selectedLocation.current.weather_description}</p>
                                            <div className="mt-4 p-2 border-l border-black bg-gray-50 dark:bg-zinc-900" style={{ fontSize: '0.75rem' }}>
                                                VISUAL DATA: ACTIVE <br />
                                                SYSTEM STATUS: NOMINAL
                                            </div>
                                        </div>
                                    </div>

                                    <div className="metric-grid">
                                        <div className="metric-item">
                                            <span className="metric-label">FEELS LIKE</span>
                                            <span className="metric-value">{Math.round(selectedLocation.current.feels_like)}°C</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">HUMIDITY</span>
                                            <span className="metric-value">{selectedLocation.current.humidity}%</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">WIND SYSTEM</span>
                                            <span className="metric-value">{selectedLocation.current.wind_speed} m/s</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">BAROMETRIC</span>
                                            <span className="metric-value">{selectedLocation.current.pressure} hPa</span>
                                        </div>
                                    </div>

                                    <div className="forecast-container">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="metric-label">5-DAY PROJECTION</p>
                                            <div style={{ height: '1px', flex: 1, background: 'var(--border-primary)', margin: '0 1rem' }}></div>
                                        </div>
                                        <div className="forecast-grid">
                                            {selectedLocation.forecast?.filter((_, i) => i % 8 === 0).map((item) => (
                                                <div key={item.forecast_timestamp} className="forecast-item">
                                                    <p className="forecast-day">{format(new Date(item.forecast_timestamp * 1000), 'EEE')}</p>
                                                    <div className="my-2 flex justify-center">{getWeatherIcon(item.weather_main)}</div>
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
