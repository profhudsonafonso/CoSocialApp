"use client"

import { 
  Lightbulb, 
  ClipboardCheck, 
  Users, 
  Wrench, 
  Rocket, 
  FileCheck, 
  TrendingUp, 
  Building2, 
  Award,
  Github,
  Trello,
  FileText,
  Search,
  Target,
  UsersRound,
  ClipboardList,
  Calculator,
  BrainCircuit,
  ChevronRight,
  Menu,
  X
} from "lucide-react"
import { BrandLogo } from "@/components/BrandLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, type FormEvent } from "react"

interface Idea {
  id: string
  nome: string
  email: string
  nome_projeto: string
  problema: string
  publico?: string
  estagio?: string
  ajuda?: string
  created_at?: string
}

interface Collaborator {
  id: string
  nome: string
  email: string
  area: string
  nivel: string
  horas?: string
  tipo_projeto?: string
  contribuicao?: string
  created_at?: string
}

interface DashboardOverview {
  totalProjects: number
  totalIssues: number
  activeTasks: number
  submittedTasks: number
  reviewedTasks: number
  acceptedTasks: number
  rejectedTasks: number
  finalizedIssues: number
  totalPoints: number
  activeCollaborators: number
}

interface DashboardProject {
  ideaId: string
  title: string
  ownerEmail?: string | null
  github_repo_url?: string | null
  totalIssues: number
  activeTasks: number
  claimedTasks: number
  submittedTasks: number
  acceptedTasks: number
  rejectedTasks: number
  finalizedIssues: number
  totalPoints: number
  lastAcceptedAt?: string | null
}

interface DashboardAcceptedTask {
  projectTitle: string
  issueNumber: number | null
  issueTitle: string
  collaboratorName: string
  collaboratorEmail: string
  points: number
  acceptedDate?: string | null
  evidence_url?: string | null
  githubIssueUrl?: string | null
}

interface DashboardTopCollaborator {
  collaboratorId: string
  name: string
  email: string
  totalPoints: number
  acceptedTasks: number
}

interface DashboardData {
  overview: DashboardOverview
  projects: DashboardProject[]
  recentAcceptedTasks: DashboardAcceptedTask[]
  topCollaborators: DashboardTopCollaborator[]
}

const navLinks = [
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#colabscore", label: "ColabScore" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "/colabai", label: "ColabAI" },
  { href: "#toolkit", label: "Toolkit" },
]

const processSteps = [
  { icon: Lightbulb, title: "Ideia cadastrada", description: "Registre sua proposta inovadora" },
  { icon: ClipboardCheck, title: "Avaliação inicial", description: "Análise de viabilidade e potencial" },
  { icon: Users, title: "Formação de squad", description: "Monte sua equipe ideal" },
  { icon: Wrench, title: "Execução em ferramentas", description: "GitHub, Trello, Jira, Notion" },
  { icon: Rocket, title: "Desenvolvimento do MVP", description: "Construção do produto mínimo" },
  { icon: FileCheck, title: "Registro de evidências", description: "Documentação no ColabScore" },
  { icon: TrendingUp, title: "Validação comercial", description: "Testes de mercado e ajustes" },
  { icon: Building2, title: "Spin-off da empresa", description: "Formalização do negócio" },
  { icon: Award, title: "Participação futura", description: "Recompensas por contribuição" },
]

const colabScoreData = [
  { projeto: "EducaSaaS", colaborador: "Ana Silva", funcao: "Front-end", pontos: 780, participacao: "12.5%" },
  { projeto: "FinControl", colaborador: "Carlos Santos", funcao: "Back-end", pontos: 650, participacao: "10.2%" },
  { projeto: "HealthTrack", colaborador: "Marina Costa", funcao: "UX Design", pontos: 420, participacao: "8.7%" },
]

const toolkitSteps = [
  { icon: Search, title: "Cadastrar ideia", description: "Registre o problema, público e proposta inicial.", action: "Abrir cadastro", href: "#cadastrar-ideia" },
  { icon: Target, title: "Validar Negócio", description: "Antes de executar, revise soluções similares, concorrentes, substitutos e evidências de mercado.", action: "Abrir Validação de Negócio", href: "/validar-negocio" },
  { icon: UsersRound, title: "Formar equipe", description: "Encontre colaboradores e organize papéis para executar.", action: "Colaborar", href: "#colaborar" },
  { icon: ClipboardList, title: "Executar tarefas", description: "Transforme aprendizado em issues, branches e pull requests.", action: "Ver projetos", href: "/contribuir/projetos" },
  { icon: Calculator, title: "Medir contribuição", description: "Revise entregas e pontue com ColabScore.", action: "Revisar tarefas", href: "/responsavel/revisar" },
  { icon: Rocket, title: "Evoluir para MVP", description: "Use evidências e contribuição validada para avançar o produto.", action: "Ver guia", href: "#dashboard" },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2">
            <BrandLogo imageClassName="h-9 w-9" />
          </a>
          
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="#cadastrar-ideia">Cadastrar Ideia</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/contribuir/projetos">Projetos</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/responsavel/revisar">Revisar</a>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
              <a href="#colaborar">Colaborar</a>
            </Button>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button 
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.href}
                  href={link.href} 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="outline" size="sm" asChild>
                  <a href="#cadastrar-ideia">Cadastrar Ideia</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/contribuir/projetos">Ver projetos</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/responsavel/revisar">Revisar tarefas</a>
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
                  <a href="#colaborar">Colaborar</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="flex justify-center mb-8">
          <BrandLogo
            showText={false}
            imageClassName="h-28 w-28 rounded-2xl md:h-36 md:w-36 drop-shadow-2xl"
          />
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
          ColabSocial: transforme{" "}
          <span className="text-primary">colaboração</span> em{" "}
          <span className="text-secondary">participação</span>.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto mb-10 text-pretty leading-relaxed">
          A ColabSocial conecta ideias, talentos e oportunidades para transformar colaboração em MVPs, 
          produtos e novas startups, usando o ColabScore: um sistema transparente de pontuação e 
          recompensa por contribuição.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg" asChild>
            <a href="#cadastrar-ideia">
              <Lightbulb className="mr-2 h-5 w-5" />
              Quero cadastrar uma ideia
            </a>
          </Button>
          <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary/10 px-8 py-6 text-lg" asChild>
            <a href="#colaborar">
              <Users className="mr-2 h-5 w-5" />
              Quero colaborar com projetos
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-24 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Como funciona</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Do nascimento da ideia até a criação de uma nova empresa, acompanhe cada etapa do processo
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {processSteps.map((step, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function IdeaFormSection() {
  const [nomeIdeia, setNomeIdeia] = useState('')
  const [emailIdeia, setEmailIdeia] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [problema, setProblema] = useState('')
  const [publico, setPublico] = useState('')
  const [estagio, setEstagio] = useState('')
  const [ajuda, setAjuda] = useState('')
  const [githubRepoUrl, setGithubRepoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeIdeia,
          email: emailIdeia,
          nomeProjeto,
          problema,
          publico,
          estagio,
          ajuda,
          githubRepoUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao enviar a ideia. Tente novamente.')
      }

      alert('Ideia enviada com sucesso! Obrigado pelo seu cadastro.')
      setNomeIdeia('')
      setEmailIdeia('')
      setNomeProjeto('')
      setProblema('')
      setPublico('')
      setEstagio('')
      setAjuda('')
      setGithubRepoUrl('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro desconhecido ao enviar a ideia.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="cadastrar-ideia" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Para quem tem uma ideia
            </h2>
            <p className="text-lg text-muted-foreground mb-6 text-pretty">
              Tem uma ideia, mas ainda não tem equipe? Cadastre sua proposta e encontre colaboradores 
              apaixonados por transformar inovação em realidade.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                <span>Valide seu conceito</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span>Encontre talentos</span>
              </div>
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-accent" />
                <span>Lance seu MVP</span>
              </div>
            </div>
          </div>
          
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Cadastre sua ideia</CardTitle>
              <CardDescription>Preencha os dados abaixo para começar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome-ideia">Nome</Label>
                    <Input
                      id="nome-ideia"
                      value={nomeIdeia}
                      onChange={(event) => setNomeIdeia(event.target.value)}
                      placeholder="Seu nome"
                      className="bg-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-ideia">E-mail</Label>
                    <Input
                      id="email-ideia"
                      type="email"
                      value={emailIdeia}
                      onChange={(event) => setEmailIdeia(event.target.value)}
                      placeholder="seu@email.com"
                      className="bg-input"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome-projeto">Nome da ideia</Label>
                  <Input
                    id="nome-projeto"
                    value={nomeProjeto}
                    onChange={(event) => setNomeProjeto(event.target.value)}
                    placeholder="Nome do seu projeto"
                    className="bg-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problema">Qual problema resolve?</Label>
                  <Textarea
                    id="problema"
                    value={problema}
                    onChange={(event) => setProblema(event.target.value)}
                    placeholder="Descreva o problema que sua ideia resolve..."
                    className="bg-input min-h-[80px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publico">Público-alvo</Label>
                    <Input
                      id="publico"
                      value={publico}
                      onChange={(event) => setPublico(event.target.value)}
                      placeholder="Ex: PMEs, estudantes..."
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estagio">Estágio</Label>
                    <Select value={estagio} onValueChange={setEstagio} name="estagio">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">Apenas ideia</SelectItem>
                        <SelectItem value="validation">Em validação</SelectItem>
                        <SelectItem value="prototype">Com protótipo</SelectItem>
                        <SelectItem value="mvp">MVP pronto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ajuda">Que tipo de ajuda precisa?</Label>
                  <Textarea
                    id="ajuda"
                    value={ajuda}
                    onChange={(event) => setAjuda(event.target.value)}
                    placeholder="Desenvolvimento, design, marketing, vendas..."
                    className="bg-input min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-repo-url">Repositório GitHub do projeto</Label>
                  <Input
                    id="github-repo-url"
                    value={githubRepoUrl}
                    onChange={(event) => setGithubRepoUrl(event.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="bg-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Cadastrar minha ideia'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function CollaboratorFormSection() {
  const [nomeColab, setNomeColab] = useState('')
  const [emailColab, setEmailColab] = useState('')
  const [area, setArea] = useState('')
  const [nivel, setNivel] = useState('')
  const [horas, setHoras] = useState('')
  const [tipoProjeto, setTipoProjeto] = useState('')
  const [contribuicao, setContribuicao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeColab,
          email: emailColab,
          area,
          nivel,
          horas,
          tipoProjeto,
          contribuicao,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Erro ao enviar seus dados. Tente novamente.')
      }

      alert('Cadastro de colaborador enviado com sucesso! Obrigado pela sua participação.')
      setNomeColab('')
      setEmailColab('')
      setArea('')
      setNivel('')
      setHoras('')
      setTipoProjeto('')
      setContribuicao('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro desconhecido ao enviar seu cadastro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="colaborar" className="py-24 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Card className="bg-card border-border order-2 lg:order-1">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Quero colaborar</CardTitle>
              <CardDescription>Cadastre-se para participar de projetos inovadores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome-colab">Nome</Label>
                    <Input
                      id="nome-colab"
                      value={nomeColab}
                      onChange={(event) => setNomeColab(event.target.value)}
                      placeholder="Seu nome"
                      className="bg-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-colab">E-mail</Label>
                    <Input
                      id="email-colab"
                      type="email"
                      value={emailColab}
                      onChange={(event) => setEmailColab(event.target.value)}
                      placeholder="seu@email.com"
                      className="bg-input"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Área de atuação</Label>
                    <Select value={area} onValueChange={setArea} name="area">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frontend">Front-end</SelectItem>
                        <SelectItem value="backend">Back-end</SelectItem>
                        <SelectItem value="fullstack">Full-stack</SelectItem>
                        <SelectItem value="ux">UX/UI Design</SelectItem>
                        <SelectItem value="pm">Product Management</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nível de experiência</Label>
                    <Select value={nivel} onValueChange={setNivel} name="nivel">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Júnior (0-2 anos)</SelectItem>
                        <SelectItem value="pleno">Pleno (2-5 anos)</SelectItem>
                        <SelectItem value="senior">Sênior (5+ anos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horas">Horas disponíveis/semana</Label>
                    <Select value={horas} onValueChange={setHoras} name="horas">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Até 5 horas</SelectItem>
                        <SelectItem value="10">5-10 horas</SelectItem>
                        <SelectItem value="20">10-20 horas</SelectItem>
                        <SelectItem value="40">20+ horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo-projeto">Tipo de projeto</Label>
                    <Select value={tipoProjeto} onValueChange={setTipoProjeto} name="tipoProjeto">
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="mobile">Mobile App</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                        <SelectItem value="fintech">Fintech</SelectItem>
                        <SelectItem value="healthtech">Healthtech</SelectItem>
                        <SelectItem value="edtech">Edtech</SelectItem>
                        <SelectItem value="qualquer">Qualquer área</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contribuicao">Como pretende contribuir?</Label>
                  <Textarea
                    id="contribuicao"
                    value={contribuicao}
                    onChange={(event) => setContribuicao(event.target.value)}
                    placeholder="Descreva como você pode ajudar nos projetos..."
                    className="bg-input min-h-[60px]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Quero colaborar'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Para quem quer colaborar
            </h2>
            <p className="text-lg text-muted-foreground mb-6 text-pretty">
              Quer participar de startups mesmo sem investir dinheiro? Contribua com tempo e conhecimento 
              e ganhe participação proporcional ao seu esforço através do ColabScore.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Ganhe participação real</h4>
                  <p className="text-sm text-muted-foreground">Suas contribuições são convertidas em equity futuro</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Desenvolva habilidades</h4>
                  <p className="text-sm text-muted-foreground">Trabalhe em projetos reais com equipes diversas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Faça parte do sucesso</h4>
                  <p className="text-sm text-muted-foreground">Acompanhe o crescimento das startups que ajudou a criar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DatabasePreviewSection() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [ideasRes, collaboratorsRes] = await Promise.all([
          fetch('/api/ideas'),
          fetch('/api/collaborators'),
        ])

        if (!ideasRes.ok || !collaboratorsRes.ok) {
          throw new Error('Falha ao buscar dados do banco.')
        }

        const ideasJson = await ideasRes.json()
        const collaboratorsJson = await collaboratorsRes.json()

        setIdeas(ideasJson.data ?? [])
        setCollaborators(collaboratorsJson.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <section id="dados-do-banco" className="py-24 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Dados reais do banco</h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Veja as ideias e colaboradores armazenados no Supabase em tempo real.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-foreground">Carregando dados...</div>
        ) : error ? (
          <div className="text-center text-destructive">{error}</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Últimas ideias cadastradas</CardTitle>
                <CardDescription>{ideas.length} registro(s) no banco</CardDescription>
              </CardHeader>
              <CardContent>
                {ideas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ideia cadastrada ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {ideas.slice(0, 4).map((idea) => (
                      <div key={idea.id} className="rounded-2xl border border-border p-4 bg-background">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="font-semibold text-foreground">{idea.nome_projeto}</span>
                          <span className="text-xs text-muted-foreground">{idea.estagio ?? 'Não informado'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{idea.problema}</p>
                        <p className="text-sm text-foreground"><strong>{idea.nome}</strong> · {idea.publico ?? 'Público não informado'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Últimos colaboradores</CardTitle>
                <CardDescription>{collaborators.length} registro(s) no banco</CardDescription>
              </CardHeader>
              <CardContent>
                {collaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {collaborators.slice(0, 4).map((collab) => (
                      <div key={collab.id} className="rounded-2xl border border-border p-4 bg-background">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="font-semibold text-foreground">{collab.nome}</span>
                          <span className="text-xs text-muted-foreground">{collab.nivel}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Área: {collab.area}</p>
                        <p className="text-sm text-foreground">Disponibilidade: {collab.horas ?? 'Não informada'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  )
}

function ColabScoreSection() {
  return (
    <section id="colabscore" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Award className="h-4 w-4" />
            Sistema de Pontuação
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            ColabScore
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Uma camada inteligente sobre ferramentas que você já usa: GitHub, GitLab, Trello, Jira, Notion. 
            Cada contribuição é registrada, validada e convertida em pontos de participação.
          </p>
        </div>

        {/* Integration icons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <Github className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">GitHub</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <Trello className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Trello</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Notion</span>
          </div>
        </div>

        {/* Formula */}
        <Card className="bg-card border-border mb-12 max-w-4xl mx-auto">
          <CardContent className="p-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Fórmula do ColabScore</h3>
            <div className="bg-muted/50 rounded-xl p-6 text-center overflow-x-auto">
              <code className="text-sm md:text-base text-foreground font-mono whitespace-nowrap">
                <span className="text-primary font-bold">Pontos</span> = Horas validadas × Valor-hora × <span className="text-secondary">Fator de entrega</span> × <span className="text-accent">Fator de impacto</span> × Fator de risco
              </code>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Cada variável é calculada automaticamente com base nas evidências registradas nas ferramentas integradas.
            </p>
          </CardContent>
        </Card>

        {/* Demo table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Tabela demonstrativa</CardTitle>
            <CardDescription>Exemplo de pontuação por colaborador em diferentes projetos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Projeto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Colaborador</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Função</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Pontos</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {colabScoreData.map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{row.projeto}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{row.colaborador}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {row.funcao}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-accent">{row.pontos}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{row.participacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Cada projeto tem seu próprio banco de pontos. Acúmulo transparente por contribuição.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function DashboardSection() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error || 'Erro ao carregar dashboard.')
        }

        setDashboard(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dashboard.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const formatDate = (value?: string | null) => {
    if (!value) {
      return 'Sem aceite'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  return (
    <section id="dashboard" className="py-24 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Dashboard
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Cada contribuição fica ligada a um projeto, tarefa e evidência. Justo, transparente e motivador.
          </p>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto mt-3">
            Dados calculados a partir de tarefas submetidas, revisadas e aceitas no fluxo GitHub.
          </p>
        </div>

        {loading ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-6 text-center text-muted-foreground">Carregando dashboard...</CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-6 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : dashboard ? (
          <div className="grid gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Projetos</div>
                  <div className="text-3xl font-bold text-foreground mt-2">{dashboard.overview.totalProjects}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Issues</div>
                  <div className="text-3xl font-bold text-foreground mt-2">{dashboard.overview.totalIssues}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Tarefas ativas</div>
                  <div className="text-3xl font-bold text-foreground mt-2">{dashboard.overview.activeTasks}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Pontos</div>
                  <div className="text-3xl font-bold text-accent mt-2">{dashboard.overview.totalPoints.toLocaleString('pt-BR')}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Visão Geral de Projetos</CardTitle>
                <CardDescription>
                  {dashboard.overview.submittedTasks} tarefa(s) submetida(s), {dashboard.overview.reviewedTasks} revisada(s), {dashboard.overview.finalizedIssues} issue(s) finalizada(s), {dashboard.overview.activeCollaborators} colaborador(es) ativo(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Projeto</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Issues</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Em andamento</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Submetidas</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Aceitas</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Rejeitadas</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Finalizadas</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.projects.map((project) => (
                          <tr key={project.ideaId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{project.title}</div>
                              <div className="text-xs text-muted-foreground">{project.ownerEmail || 'Responsável não informado'}</div>
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{project.totalIssues}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{project.activeTasks ?? project.claimedTasks}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{project.submittedTasks}</td>
                            <td className="py-3 px-4 text-center text-secondary">{project.acceptedTasks}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{project.rejectedTasks}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{project.finalizedIssues}</td>
                            <td className="py-3 px-4 text-right font-semibold text-accent">{project.totalPoints.toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Top colaboradores</CardTitle>
                <CardDescription>Pontos vindos de tarefas aceitas</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.topCollaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum ponto aceito ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Nome</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Aceites</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.topCollaborators.map((collaborator) => (
                          <tr key={collaborator.collaboratorId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-3">
                              <div className="text-sm text-foreground">{collaborator.name}</div>
                              <div className="text-xs text-muted-foreground">{collaborator.email}</div>
                            </td>
                            <td className="py-2 px-3 text-center text-sm text-muted-foreground">{collaborator.acceptedTasks}</td>
                            <td className="py-2 px-3 text-right text-sm font-semibold text-accent">{collaborator.totalPoints.toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Tarefas aceitas recentes</CardTitle>
                <CardDescription>Últimas contribuições revisadas e aceitas</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.recentAcceptedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa aceita ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {dashboard.recentAcceptedTasks.map((task, index) => (
                      <div key={`${task.projectTitle}-${task.issueNumber}-${index}`} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              #{task.issueNumber} {task.issueTitle}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task.projectTitle} · {task.collaboratorName || task.collaboratorEmail} · {formatDate(task.acceptedDate)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-accent whitespace-nowrap">{task.points.toLocaleString('pt-BR')} pts</div>
                        </div>
                        {(task.evidence_url || task.githubIssueUrl) && (
                          <div className="flex flex-wrap gap-3 mt-3 text-xs">
                            {task.evidence_url && (
                              <a className="text-primary hover:underline" href={task.evidence_url} target="_blank" rel="noreferrer">
                                Evidência
                              </a>
                            )}
                            {task.githubIssueUrl && (
                              <a className="text-primary hover:underline" href={task.githubIssueUrl} target="_blank" rel="noreferrer">
                                Issue GitHub
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ToolkitSection() {
  const handleClick = () => {
    alert("Funcionalidade em desenvolvimento no MVP")
  }

  return (
    <section id="toolkit" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Guia Integrado de Inovação
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            A ColabSocial guia cada projeto por etapas práticas de inovação com templates e scorecards. 
            Do problema à recompensa, cada passo é estruturado e mensurável.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {toolkitSteps.map((step, index) => (
            <Card 
              key={index} 
              className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
            >
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-xs font-bold text-accent mb-2">Etapa {index + 1}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="mb-4 min-h-[48px] text-sm text-muted-foreground">{step.description}</p>
                {step.href ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border hover:bg-primary/10 hover:border-primary"
                    asChild
                  >
                    <a href={step.href}>
                      {step.action}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border hover:bg-primary/10 hover:border-primary"
                    onClick={handleClick}
                  >
                    {step.action}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function ColabAiAssistSection() {
  return (
    <section className="bg-card/50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="border-primary/30 bg-card">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit">
                MVP experimental
              </Badge>
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
                  <BrainCircuit className="h-7 w-7 text-primary" />
                  ColabAI Assist
                </h2>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Use IA para entender tarefas, gerar planos técnicos, criar prompts para IDE e revisar entregas.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  MVP experimental com créditos internos. Não compartilha contas premium; usa API no backend.
                </p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <a href="/colabai">
                Abrir ColabAI Assist
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/10" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-balance">
          Faça parte de um novo modelo de empreendedorismo colaborativo
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Conecte-se com pessoas que compartilham sua visão. Transforme ideias em realidade com o 
          poder da colaboração.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg" asChild>
            <a href="#cadastrar-ideia">
              <Lightbulb className="mr-2 h-5 w-5" />
              Cadastrar uma ideia
            </a>
          </Button>
          <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary/10 px-8 py-6 text-lg" asChild>
            <a href="#colaborar">
              <Users className="mr-2 h-5 w-5" />
              Quero colaborar
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo imageClassName="h-8 w-8" />
          </div>
          
          <div className="text-center md:text-right space-y-1">
            <p className="text-muted-foreground text-sm">
              Out_off_D_Box: conectando ideias, pessoas, produtos e inovação.
            </p>
            <p className="text-muted-foreground text-sm">
              Out_off_D_Box: evoluindo ideias, evoluindo pessoas, evoluindo o mundo.
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ColabSocial. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function ColabSocialPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <IdeaFormSection />
      <CollaboratorFormSection />
      <DatabasePreviewSection />
      <ColabScoreSection />
      <DashboardSection />
      <ColabAiAssistSection />
      <ToolkitSection />
      <CTASection />
      <Footer />
    </main>
  )
}
