// frontend/src/components/auth/SignUpForm.tsx
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { z } from "zod"

// ==========================================
// 1. LOGIN COMPONENT
// ==========================================

function Login({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email-login" className="text-sm font-medium text-slate-200">Email Address</Label>
          <Input id="email-login" type="email" placeholder="e.g., your.email@school.edu" className="bg-slate-900 border-slate-700 text-white focus:ring-primary focus:border-primary" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pass-login" className="text-sm font-medium text-slate-200">Password</Label>
          <Input id="pass-login" type="password" className="bg-slate-900 border-slate-700 text-white focus:ring-primary focus:border-primary" />
        </div>
        
        <Button variant="default" className="w-full mt-2">Log In</Button>
      </div>

      {/* DIVIDER */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500">Or continue with</span></div>
      </div>

      {/* SOCIAL LOGINS */}
      <div className="flex flex-col gap-3">
        <Button variant="outline" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
          <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </Button>
        <Button variant="outline" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
          <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </Button>
      </div>

      <div className="flex flex-col gap-2 text-center mt-2">
        <p className="text-sm text-slate-400">Don't have an account yet?</p>
        <Button 
          variant="ghost" 
          onClick={onSwitchToRegister}
          className="w-full text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
        >
          Create new account
        </Button>
      </div>
    </div>
  )
}

// ==========================================
// ZOD SCHEMA (Defined outside the component)
// ==========================================

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().regex(
    /^\+\d{1,4}\s?[0-9\s]{6,14}$/, 
    "Must start with country code (e.g., +421, +49) followed by digits."
  ),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // This tells Zod to attach the error to the confirmPassword field
})

// ==========================================
// REGISTER COMPONENT
// ==========================================

export function Register() {
  // Form data state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "", 
    password: "",
    confirmPassword: ""
  })

  // Error messages state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Generic change handler for inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    
    // Clear the specific error when the user starts typing again
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }))
    }
  }

  // Real-time email check (Triggered onBlur)
  const checkEmailAvailability = async (emailToCheck: string) => {
    // Basic pre-check so we don't spam the backend with incomplete emails
    if (!emailToCheck || !emailToCheck.includes("@")) return

    try {
      const response = await fetch("http://localhost:3000/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      })
      
      const data = await response.json()
      
      // If the backend says the email is NOT available, show an error
      if (!data.available) {
        setErrors(prev => ({ ...prev, email: "This email is already registered." }))
      }
    } catch (error) {
      console.error("Failed to check email:", error)
    }
  }

  // Validation and submission logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Run Zod validation against the current form data
    const result = registerSchema.safeParse(formData)

    // 2. If Zod validation fails, map the errors and stop submission
    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        formattedErrors[issue.path[0] as string] = issue.message 
      })
      setErrors(formattedErrors)
      return
    }

    // 3. Check if the async email validation previously caught an error
    if (errors.email === "This email is already registered.") {
      return // Stop submission if the email is taken
    }

    // 4. If everything passes, send the data to the backend
    console.log("Validation passed! Ready to send to API:", result.data)
    // TODO: Main fetch request to actually create the account goes here
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
      
      <div className="grid grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium text-slate-200">First Name</Label>
          <Input 
            id="firstName" 
            value={formData.firstName} 
            onChange={handleChange} 
            placeholder="John" 
            className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`} 
          />
          {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
        </div>
        
        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium text-slate-200">Last Name</Label>
          <Input 
            id="lastName" 
            value={formData.lastName} 
            onChange={handleChange} 
            placeholder="Doe" 
            className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`} 
          />
          {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-200">Email Address</Label>
        <Input 
          id="email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange} 
          onBlur={() => checkEmailAvailability(formData.email)} // Triggers when user clicks outside the input
          placeholder="john.doe@school.edu" 
          className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`} 
        />
        {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-slate-200">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          value={formData.phone} 
          onChange={handleChange} 
          placeholder="+421 9XX XXX XXX" 
          className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`} 
        />
        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-200">Password</Label>
        <Input 
          id="password" 
          type="password" 
          value={formData.password} 
          onChange={handleChange} 
          placeholder="Min. 8 characters" 
          className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`} 
        />
        {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">Confirm Password</Label>
        <Input 
          id="confirmPassword" 
          type="password" 
          value={formData.confirmPassword} 
          onChange={handleChange} 
          placeholder="Repeat password" 
          className={`bg-slate-900 border-slate-700 text-white focus:ring-primary ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`} 
        />
        {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="default" className="w-full mt-4">
        Sign Up
      </Button>
    </form>
  )
}
// ==========================================
// MAIN WRAPPER COMPONENT (Exported)
// ==========================================
export function SignUpForm() {
  const [view, setView] = useState<'login' | 'register'>('login')

  return (
    <Dialog onOpenChange={(open) => {
      // Reset to login view shortly after modal closes
      if (!open) setTimeout(() => setView('login'), 300)
    }}>
      <DialogTrigger asChild>
        <button className="btn-primary">Sign Up</button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-slate-950 text-slate-100 border-slate-800 shadow-2xl overflow-hidden">
        
        {/* HEADER SECTION */}
        <DialogHeader className="relative">
          {view === 'register' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute -left-2 -top-2 h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 z-10"
              onClick={() => setView('login')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <DialogTitle className={`text-xl font-bold text-white ${view === 'register' ? 'pl-8' : ''}`}>
            {view === 'login' ? 'Gym Access' : 'Create an Account'}
          </DialogTitle>
          <DialogDescription className={`text-slate-400 ${view === 'register' ? 'pl-8' : ''}`}>
            {view === 'login' 
              ? 'Please log in to your account.' 
              : 'Fill in the details to register.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* CONTENT SECTION */}
        <div className="py-2 relative">
          {/* Render Login or Register based on 'view' state */}
          {view === 'login' && <Login onSwitchToRegister={() => setView('register')} />}
          {view === 'register' && <Register />}
        </div>

      </DialogContent>
    </Dialog>
  )
}