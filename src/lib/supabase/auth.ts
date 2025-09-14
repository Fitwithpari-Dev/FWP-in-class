// Authentication utilities for FitWithPari
// Handles user registration, login, role management, and profile setup

import { supabase, UserProfile, UserRole, StudentLevel } from './supabase-client'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  role: UserRole
  phone?: string
  dateOfBirth?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  fitnessLevel?: StudentLevel
  fitnessGoals?: string[]
}

export interface SignInData {
  email: string
  password: string
}

export interface ProfileUpdateData {
  fullName?: string
  phone?: string
  dateOfBirth?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  fitnessLevel?: StudentLevel
  fitnessGoals?: string[]
  preferredWorkoutTimes?: string[]
  timezone?: string
  avatarUrl?: string
}

export interface HealthConsiderationData {
  type: 'injury' | 'condition' | 'modification' | 'preference'
  title: string
  description: string
  affectedExercises?: string[]
  severity: 'low' | 'medium' | 'high'
  recommendedModifications?: string[]
}

export class AuthService {
  // Sign up new user with profile creation
  static async signUp(userData: SignUpData) {
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('User creation failed')
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role,
          phone: userData.phone,
          date_of_birth: userData.dateOfBirth,
          emergency_contact_name: userData.emergencyContactName,
          emergency_contact_phone: userData.emergencyContactPhone,
          fitness_level: userData.fitnessLevel,
          fitness_goals: userData.fitnessGoals,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_active: true
        })

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      return {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: !authData.session
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Sign in existing user
  static async signIn(credentials: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        throw new Error(error.message)
      }

      // Fetch user profile
      if (data.user) {
        const profile = await this.getUserProfile(data.user.id)
        return {
          user: data.user,
          session: data.session,
          profile
        }
      }

      return data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Get current user profile
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Get user profile error:', error)
      return null
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: ProfileUpdateData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  // Upload avatar image
  static async uploadAvatar(userId: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${userId}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      // Update user profile with avatar URL
      await this.updateProfile(userId, { avatarUrl: publicUrl })

      return publicUrl
    } catch (error) {
      console.error('Avatar upload error:', error)
      throw error
    }
  }

  // Add health consideration
  static async addHealthConsideration(userId: string, healthData: HealthConsiderationData) {
    try {
      const { data, error } = await supabase
        .from('health_considerations')
        .insert({
          user_id: userId,
          type: healthData.type,
          title: healthData.title,
          description: healthData.description,
          affected_exercises: healthData.affectedExercises,
          severity: healthData.severity,
          recommended_modifications: healthData.recommendedModifications,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Add health consideration error:', error)
      throw error
    }
  }

  // Get user health considerations
  static async getUserHealthConsiderations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('health_considerations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Get health considerations error:', error)
      throw error
    }
  }

  // Update health consideration
  static async updateHealthConsideration(
    considerationId: string,
    updates: Partial<HealthConsiderationData>
  ) {
    try {
      const { data, error } = await supabase
        .from('health_considerations')
        .update(updates)
        .eq('id', considerationId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Update health consideration error:', error)
      throw error
    }
  }

  // Delete health consideration
  static async deleteHealthConsideration(considerationId: string) {
    try {
      const { error } = await supabase
        .from('health_considerations')
        .update({ is_active: false })
        .eq('id', considerationId)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Delete health consideration error:', error)
      throw error
    }
  }

  // Password reset
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }

  // Check if user is coach
  static async isCoach(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId)
      return profile?.role === 'coach' || profile?.role === 'admin'
    } catch {
      return false
    }
  }

  // Check if user is admin
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId)
      return profile?.role === 'admin'
    } catch {
      return false
    }
  }

  // Get user role
  static async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const profile = await this.getUserProfile(userId)
      return profile?.role || null
    } catch {
      return null
    }
  }

  // Social login (Google)
  static async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  // Handle OAuth callback and create profile if needed
  static async handleOAuthCallback(userId: string, email: string, fullName: string) {
    try {
      // Check if profile already exists
      const existingProfile = await this.getUserProfile(userId)

      if (!existingProfile) {
        // Create new profile for OAuth user
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            role: 'student', // Default role for OAuth users
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            is_active: true
          })

        if (error) {
          throw new Error(`Profile creation failed: ${error.message}`)
        }
      }

      return await this.getUserProfile(userId)
    } catch (error) {
      console.error('OAuth callback error:', error)
      throw error
    }
  }
}

// React hook for authentication state
export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        AuthService.getUserProfile(session.user.id).then(setProfile)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        if (session?.user) {
          const userProfile = await AuthService.getUserProfile(session.user.id)
          setProfile(userProfile)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    loading,
    signIn: AuthService.signIn,
    signUp: AuthService.signUp,
    signOut: AuthService.signOut,
    isCoach: profile?.role === 'coach' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student'
  }
}