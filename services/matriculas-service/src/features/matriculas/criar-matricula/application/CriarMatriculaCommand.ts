export interface CriarMatriculaCommand {
  alunoId: string;
  turmaId: string;
  planoId: string;
}

export interface CriarMatriculaOutput {
  matriculaId: string;
  status: string;
  dataFim: Date;
}
