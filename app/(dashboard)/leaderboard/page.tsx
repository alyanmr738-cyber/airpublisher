import { Trophy } from 'lucide-react'
import { getLeaderboard } from '@/lib/db/leaderboard'
import { getCurrentCreator } from '@/lib/db/creator'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const creator = await getCurrentCreator()
  
  // Wrap in try-catch to handle errors gracefully
  let globalAllTime: any[] = []
  let globalWeekly: any[] = []
  
  try {
    const results = await Promise.allSettled([
      getLeaderboard('all_time', 100),
      getLeaderboard('weekly', 100),
    ])
    
    if (results[0].status === 'fulfilled') {
      globalAllTime = results[0].value
    } else {
      console.error('Error loading all-time leaderboard:', results[0].reason)
    }
    
    if (results[1].status === 'fulfilled') {
      globalWeekly = results[1].value
    } else {
      console.error('Error loading weekly leaderboard:', results[1].reason)
    }
  } catch (error) {
    console.error('Error loading leaderboards:', error)
  }

  // Use live data only - no mock data for production
  const allTimeEntries = globalAllTime
  const weeklyEntries = globalWeekly

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              ←
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center gap-3">
              Leaderboard
              <Trophy className="h-8 w-8 text-yellow-400" />
            </h1>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">All Time</h2>
            <div className="space-y-2">
              {allTimeEntries.length > 0 ? (
                allTimeEntries.map((entry, index) => (
                  <div key={entry.creator_unique_identifier} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold w-8">#{index + 1}</span>
                      <span>{entry.creator_unique_identifier}</span>
                    </div>
                    <span className="font-semibold">{entry.score}</span>
                  </div>
                ))
              ) : (
                <p className="text-white/60">No entries yet</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Weekly</h2>
            <div className="space-y-2">
              {weeklyEntries.length > 0 ? (
                weeklyEntries.map((entry, index) => (
                  <div key={entry.creator_unique_identifier} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold w-8">#{index + 1}</span>
                      <span>{entry.creator_unique_identifier}</span>
                    </div>
                    <span className="font-semibold">{entry.score}</span>
                  </div>
                ))
              ) : (
                <p className="text-white/60">No entries yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
