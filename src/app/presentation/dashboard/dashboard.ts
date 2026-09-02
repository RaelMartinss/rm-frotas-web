import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideTruck,
  LucideCheckCircle2,
  LucideWrench,
  LucideXCircle,
  LucideAlertTriangle,
  LucideFileText,
  LucideShieldAlert,
  LucideTrendingUp
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideTruck,
    LucideCheckCircle2,
    LucideWrench,
    LucideXCircle,
    LucideAlertTriangle,
    LucideFileText,
    LucideShieldAlert
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {}
